import { randomUUID } from "node:crypto";
import { createPostgresImportStore, createSnapshotImportHandler } from "./import-handler.js";
import { createPostgresWorkerClient } from "./postgres.js";
import { loadConfiguredAdapters, parseAdapterSpecs } from "./adapter-loader.js";
import { createIngestionWorker, type WorkerJobHandler } from "./worker.js";
import { createS3SnapshotArchive } from "./archive.js";
import { assertStorageAdmission } from "./storage-pressure.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the ingestion worker.");

const sql = createPostgresWorkerClient(databaseUrl);
const adapters = await loadConfiguredAdapters(parseAdapterSpecs(process.env.OPENTRADE_WORKER_ADAPTERS));
const handlers: Record<string, WorkerJobHandler> = {};
if (adapters.size > 0) {
  const archive = createS3SnapshotArchive({
    endpoint: requiredEnvironment("SNAPSHOT_ARCHIVE_ENDPOINT"),
    region: requiredEnvironment("SNAPSHOT_ARCHIVE_REGION"),
    accessKeyId: requiredEnvironment("SNAPSHOT_ARCHIVE_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("SNAPSHOT_ARCHIVE_SECRET_ACCESS_KEY"),
  });
  handlers.snapshot_import = createSnapshotImportHandler({
    adapters,
    store: createPostgresImportStore(sql),
    allowedSnapshotRoot: requiredEnvironment("OPENTRADE_SNAPSHOT_ROOT"),
    maxSnapshotBytes: readPositiveInteger("OPENTRADE_MAX_SNAPSHOT_BYTES", 2_147_483_648),
    archiveBucket: requiredEnvironment("SNAPSHOT_BUCKET"),
    archive,
    storageAdmission: () => assertStorageAdmission({
      filePath: requiredEnvironment("OPENTRADE_STORAGE_HEALTH_FILE"),
      maxAgeMs: readPositiveInteger("OPENTRADE_STORAGE_STATUS_MAX_AGE_MS", 90_000),
      warningFreePercent: readPercentage("OPENTRADE_DISK_WARN_FREE_PERCENT", 15),
      stopFreePercent: readPercentage("OPENTRADE_DISK_STOP_FREE_PERCENT", 10),
    }),
  });
}
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

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when snapshot import adapters are configured.`);
  return value;
}

function readPercentage(name: string, fallback: number): number {
  const configured = process.env[name];
  if (configured === undefined || configured.trim() === "") return fallback;
  const value = Number(configured);
  if (!Number.isFinite(value) || value <= 0 || value >= 100) throw new Error(`${name} must be greater than 0 and less than 100.`);
  return value;
}
