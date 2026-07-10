import { randomUUID } from "node:crypto";
import { createPostgresImportStore, createSnapshotImportHandler } from "./import-handler.js";
import { createPostgresWorkerClient } from "./postgres.js";
import { loadConfiguredAdapters, parseAdapterSpecs } from "./adapter-loader.js";
import { createIngestionWorker, type WorkerJobHandler } from "./worker.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the ingestion worker.");

const sql = createPostgresWorkerClient(databaseUrl);
const adapters = await loadConfiguredAdapters(parseAdapterSpecs(process.env.OPENTRADE_WORKER_ADAPTERS));
const handlers: Record<string, WorkerJobHandler> = {};
if (adapters.size > 0) handlers.snapshot_import = createSnapshotImportHandler({ adapters, store: createPostgresImportStore(sql) });
const worker = createIngestionWorker({
  sql,
  handlers,
  queue: process.env.OPENTRADE_WORKER_QUEUE ?? "ingestion",
  workerId: process.env.OPENTRADE_WORKER_ID ?? `worker-${randomUUID()}`,
  pollIntervalMs: readPositiveInteger("OPENTRADE_WORKER_POLL_INTERVAL_MS", 1_000),
  heartbeatIntervalMs: readPositiveInteger("OPENTRADE_WORKER_HEARTBEAT_INTERVAL_MS", 30_000),
  onEvent: (event) => console.log(JSON.stringify({ service: "ingestion-worker", adapterCount: adapters.size, ...event })),
});

const shutdown = new AbortController();
process.once("SIGINT", () => shutdown.abort("SIGINT"));
process.once("SIGTERM", () => shutdown.abort("SIGTERM"));

try {
  await worker.runUntilStopped(shutdown.signal);
} finally {
  await sql.close();
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
