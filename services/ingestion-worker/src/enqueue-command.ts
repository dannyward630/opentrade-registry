import { readFile } from "node:fs/promises";
import { createS3SnapshotArchive, type SnapshotArchive } from "./archive.js";
import { enqueueSnapshotImport, type EnqueuedSnapshotImport } from "./enqueue.js";
import { createPostgresWorkerClient, type PostgresWorkerClient } from "./postgres.js";
import { loadSnapshotImportSourcePolicy, type SnapshotImportSourcePolicy } from "./source-policy.js";
import { assertStorageAdmission, type StoragePressureStatus } from "./storage-pressure.js";

const maxRequestBytes = 64 * 1024;

export type SnapshotEnqueueCommandDependencies = {
  environment: NodeJS.ProcessEnv;
  readRequest?: (path: string) => Promise<unknown>;
  createClient?: (databaseUrl: string) => PostgresWorkerClient;
  loadSourcePolicy?: (input: { registryRoot: string; sourceId: string }) => Promise<SnapshotImportSourcePolicy>;
  createArchive?: (input: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) => SnapshotArchive;
  checkStorageAdmission?: typeof assertStorageAdmission;
};

export type SnapshotEnqueueCommandResult = EnqueuedSnapshotImport & {
  storagePressure: StoragePressureSummary;
};

export type StoragePressureSummary = Pick<StoragePressureStatus,
  "status" | "freePercent" | "warningFreePercent" | "stopFreePercent" | "checkedAt"
>;

export async function runSnapshotEnqueueCommand(
  args: readonly string[],
  dependencies: SnapshotEnqueueCommandDependencies,
): Promise<SnapshotEnqueueCommandResult> {
  const requestPath = parseRequestPath(args);
  const databaseUrl = requiredEnvironment(dependencies.environment, "DATABASE_URL");
  const allowedRoot = requiredEnvironment(dependencies.environment, "OPENTRADE_SNAPSHOT_ROOT");
  const registryRoot = requiredEnvironment(dependencies.environment, "OPENTRADE_REGISTRY_ROOT");
  const archiveBucket = requiredEnvironment(dependencies.environment, "SNAPSHOT_BUCKET");
  const archiveEndpoint = requiredEnvironment(dependencies.environment, "SNAPSHOT_ARCHIVE_ENDPOINT");
  const archiveRegion = requiredEnvironment(dependencies.environment, "SNAPSHOT_ARCHIVE_REGION");
  const archiveAccessKeyId = requiredEnvironment(dependencies.environment, "SNAPSHOT_ARCHIVE_ACCESS_KEY_ID");
  const archiveSecretAccessKey = requiredEnvironment(dependencies.environment, "SNAPSHOT_ARCHIVE_SECRET_ACCESS_KEY");
  const storageHealthFile = requiredEnvironment(dependencies.environment, "OPENTRADE_STORAGE_HEALTH_FILE");
  const storageStatusMaxAgeMs = positiveInteger(dependencies.environment.OPENTRADE_STORAGE_STATUS_MAX_AGE_MS ?? "90000", "OPENTRADE_STORAGE_STATUS_MAX_AGE_MS");
  const warningFreePercent = percentage(dependencies.environment.OPENTRADE_DISK_WARN_FREE_PERCENT ?? "15", "OPENTRADE_DISK_WARN_FREE_PERCENT");
  const stopFreePercent = percentage(dependencies.environment.OPENTRADE_DISK_STOP_FREE_PERCENT ?? "10", "OPENTRADE_DISK_STOP_FREE_PERCENT");
  const maxBytes = positiveInteger(dependencies.environment.OPENTRADE_MAX_SNAPSHOT_BYTES ?? "2147483648", "OPENTRADE_MAX_SNAPSHOT_BYTES");
  const storagePressure = await (dependencies.checkStorageAdmission ?? assertStorageAdmission)({
    filePath: storageHealthFile,
    maxAgeMs: storageStatusMaxAgeMs,
    warningFreePercent,
    stopFreePercent,
  });
  const request = await (dependencies.readRequest ?? readRequestFile)(requestPath);
  const sourceId = requestSourceId(request);
  const sourcePolicy = await (dependencies.loadSourcePolicy ?? loadSnapshotImportSourcePolicy)({ registryRoot, sourceId });
  const archive = (dependencies.createArchive ?? createS3SnapshotArchive)({
    endpoint: archiveEndpoint,
    region: archiveRegion,
    accessKeyId: archiveAccessKeyId,
    secretAccessKey: archiveSecretAccessKey,
  });
  const client = (dependencies.createClient ?? createPostgresWorkerClient)(databaseUrl);
  try {
    const result = await enqueueSnapshotImport({ sql: client, request, sourcePolicy, allowedRoot, maxBytes, archiveBucket, archive });
    return { ...result, storagePressure: summarizeStoragePressure(storagePressure) };
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

function percentage(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 100) throw new Error(`${name} must be greater than 0 and less than 100.`);
  return parsed;
}

function summarizeStoragePressure(status: StoragePressureStatus): StoragePressureSummary {
  const { path: _path, totalBytes: _totalBytes, availableBytes: _availableBytes, schemaVersion: _schemaVersion, ...summary } = status;
  return summary;
}
