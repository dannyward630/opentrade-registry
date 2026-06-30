import { createServer, type IncomingMessage } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import {
  nationwideBoardInventorySchema,
  sourceRegistryEntryV1Schema,
  type SourceRegistryEntryV1,
} from "@opentrade-registry/core";
import { createRecordApi } from "./index.js";
import { createPostgresRecordRepository, type SqlClient } from "./postgres.js";
import { createRuntimeAuth } from "./runtime-auth.js";
import { createFixedWindowRateLimiter } from "./rate-limit.js";
import { setTrustedClientAddress } from "./client-address.js";

const databaseUrl = requiredEnvironment("DATABASE_URL");
const registryRoot = process.env.OPENTRADE_REGISTRY_ROOT ?? join(process.cwd(), "registry");
const port = parsePort(process.env.PORT ?? "8787");
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "opentrade-record-api",
});
const [sources, boardInventory] = await Promise.all([
  readSources(join(registryRoot, "sources")),
  readFile(join(registryRoot, "board-inventory.json"), "utf8").then((value) => nationwideBoardInventorySchema.parse(JSON.parse(value))),
]);
const sqlClient = pool as unknown as SqlClient;
const runtimeAuth = createRuntimeAuth({ environment: process.env, sqlClient, createSupabaseClient: createClient });
const api = createRecordApi({
  repository: createPostgresRecordRepository(sqlClient),
  sources,
  boardInventory,
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  anonymousRateLimiter: createFixedWindowRateLimiter({
    limit: parsePositiveInteger(process.env.ANONYMOUS_SEARCH_LIMIT ?? "60", "ANONYMOUS_SEARCH_LIMIT"),
    windowMs: parsePositiveInteger(process.env.ANONYMOUS_SEARCH_WINDOW_MS ?? "60000", "ANONYMOUS_SEARCH_WINDOW_MS"),
  }),
  ...runtimeAuth,
});

const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.url === "/health" && incoming.method === "GET") {
      await pool.query("select 1");
      outgoing.writeHead(200, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
      outgoing.end(JSON.stringify({ status: "ok", apiVersion: "2.0", sourceCount: sources.length }));
      return;
    }
    const request = await toRequest(incoming, port);
    const result = await api(request);
    outgoing.writeHead(result.status, Object.fromEntries(result.headers.entries()));
    outgoing.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    const status = error instanceof RequestTooLargeError ? 413 : 500;
    console.error("record_api_server_error", error instanceof Error ? error.message : String(error));
    outgoing.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    outgoing.end(JSON.stringify({ apiVersion: "2.0", error: { code: status === 413 ? "request_too_large" : "internal_error", message: status === 413 ? "Request body exceeds 64 KiB." : "The request could not be completed." } }));
  }
});

server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "record_api_started", port, sourceCount: sources.length })));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}

async function toRequest(incoming: IncomingMessage, portNumber: number): Promise<Request> {
  const host = incoming.headers.host ?? `127.0.0.1:${portNumber}`;
  const url = new URL(incoming.url ?? "/", `http://${host}`);
  const method = incoming.method ?? "GET";
  const body = ["GET", "HEAD"].includes(method) ? undefined : await readBody(incoming, 64 * 1024);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const request = new Request(url, { method, headers, body });
  setTrustedClientAddress(request, incoming.socket.remoteAddress);
  return request;
}

async function readBody(incoming: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of incoming) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maxBytes) throw new RequestTooLargeError();
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

async function readSources(directory: string): Promise<SourceRegistryEntryV1[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources: SourceRegistryEntryV1[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sources.push(...await readSources(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) {
      sources.push(sourceRegistryEntryV1Schema.parse(JSON.parse(await readFile(path, "utf8"))));
    }
  }
  return sources.sort((left, right) => left.id.localeCompare(right.id));
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parsePort(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) throw new Error("PORT must be an integer between 1 and 65535.");
  return parsed;
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

class RequestTooLargeError extends Error {}
