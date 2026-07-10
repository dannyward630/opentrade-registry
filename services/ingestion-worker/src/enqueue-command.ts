import { readFile } from "node:fs/promises";
import { enqueueSnapshotImport, type EnqueuedSnapshotImport } from "./enqueue.js";
import { createPostgresWorkerClient, type PostgresWorkerClient } from "./postgres.js";
import { loadSnapshotImportSourcePolicy, type SnapshotImportSourcePolicy } from "./source-policy.js";

const maxRequestBytes = 64 * 1024;

export type SnapshotEnqueueCommandDependencies = {
  environment: NodeJS.ProcessEnv;
  readRequest?: (path: string) => Promise<unknown>;
  createClient?: (databaseUrl: string) => PostgresWorkerClient;
  loadSourcePolicy?: (input: { registryRoot: string; sourceId: string }) => Promise<SnapshotImportSourcePolicy>;
};

export async function runSnapshotEnqueueCommand(
  args: readonly string[],
  dependencies: SnapshotEnqueueCommandDependencies,
): Promise<EnqueuedSnapshotImport> {
  const requestPath = parseRequestPath(args);
  const databaseUrl = requiredEnvironment(dependencies.environment, "DATABASE_URL");
  const allowedRoot = requiredEnvironment(dependencies.environment, "OPENTRADE_SNAPSHOT_ROOT");
  const registryRoot = requiredEnvironment(dependencies.environment, "OPENTRADE_REGISTRY_ROOT");
  const maxBytes = positiveInteger(dependencies.environment.OPENTRADE_MAX_SNAPSHOT_BYTES ?? "2147483648", "OPENTRADE_MAX_SNAPSHOT_BYTES");
  const request = await (dependencies.readRequest ?? readRequestFile)(requestPath);
  const sourceId = requestSourceId(request);
  const sourcePolicy = await (dependencies.loadSourcePolicy ?? loadSnapshotImportSourcePolicy)({ registryRoot, sourceId });
  const client = (dependencies.createClient ?? createPostgresWorkerClient)(databaseUrl);
  try {
    return await enqueueSnapshotImport({ sql: client, request, sourcePolicy, allowedRoot, maxBytes });
  } finally {
    await client.close();
  }
}

function requestSourceId(value: unknown): string {
  if (!value || typeof value !== "object" || typeof (value as { sourceId?: unknown }).sourceId !== "string") {
    throw new Error("Import request requires sourceId.");
  }
  return (value as { sourceId: string }).sourceId;
}

export function parseRequestPath(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--request" || !args[1]?.trim()) {
    throw new Error("Usage: enqueue-import --request /path/to/import-request.json");
  }
  return args[1];
}

async function readRequestFile(path: string): Promise<unknown> {
  const file = await readFile(path);
  if (file.byteLength > maxRequestBytes) throw new Error(`Import request exceeds ${maxRequestBytes} bytes.`);
  try {
    return JSON.parse(file.toString("utf8"));
  } catch {
    throw new Error("Import request must contain valid JSON.");
  }
}

function requiredEnvironment(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive safe integer.`);
  return parsed;
}
