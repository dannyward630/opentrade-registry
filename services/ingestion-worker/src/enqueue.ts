import { z } from "zod";
import { inspectSnapshotFile, type SnapshotFileInspection } from "./snapshot-file.js";
import type { WorkerSqlClient } from "./worker.js";

const publicationDispositionSchema = z.enum(["allowed", "review_required", "restricted", "withheld"]);
const unknownBooleanSchema = z.union([z.boolean(), z.literal("unknown")]);

export const snapshotImportRequestSchema = z.object({
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  allowedSourceHosts: z.array(z.string().min(1)).min(1),
  objectKey: z.string().min(1),
  filePath: z.string().min(1),
  fetchedAt: z.string().datetime(),
  sourceLastModifiedAt: z.string().datetime().nullable().optional(),
  contentType: z.string().min(1).nullable().optional(),
  etag: z.string().min(1).nullable().optional(),
  uncompressedBytes: z.number().int().nonnegative().nullable().optional(),
  snapshotMetadata: z.record(z.string(), z.unknown()).default({}),
  adapterPackage: z.string().regex(/^@opentrade-registry\/[a-z0-9-]+$/),
  adapterVersion: z.string().min(1),
  strict: z.boolean().default(true),
  publication: z.object({
    disposition: publicationDispositionSchema,
    rawRecordDisposition: publicationDispositionSchema,
    reviewedAt: z.string().datetime(),
    notes: z.array(z.string().min(1)).optional(),
  }),
  sensitivity: z.object({
    level: z.enum(["business_only", "personal_contact", "sensitive_personal_data", "unknown"]),
    containsHomeAddress: unknownBooleanSchema,
    containsPersonalEmail: unknownBooleanSchema,
    containsPersonalPhone: unknownBooleanSchema,
    redactedFields: z.array(z.string().min(1)).optional(),
  }),
});

export type SnapshotImportRequest = z.infer<typeof snapshotImportRequestSchema>;

export type EnqueuedSnapshotImport = {
  snapshotDatabaseId: number;
  snapshotPublicId: string;
  jobDatabaseId: number;
  jobPublicId: string;
  jobStatus: string;
  snapshotCreated: boolean;
  jobCreated: boolean;
  sha256: string;
  bytes: number;
  filePath: string;
};

export async function enqueueSnapshotImport(input: {
  sql: WorkerSqlClient;
  request: unknown;
  allowedRoot: string;
  maxBytes: number;
  signal?: AbortSignal;
  inspectFile?: typeof inspectSnapshotFile;
}): Promise<EnqueuedSnapshotImport> {
  const request = snapshotImportRequestSchema.parse(input.request);
  assertAllowedSourceUrl(request.sourceUrl, request.allowedSourceHosts);
  assertSafeObjectKey(request.objectKey);
  const inspection = await (input.inspectFile ?? inspectSnapshotFile)({
    filePath: request.filePath,
    allowedRoot: input.allowedRoot,
    maxBytes: input.maxBytes,
    signal: input.signal,
  });

  const result = await input.sql.query(`
    select * from opentrade.enqueue_snapshot_import(
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11::jsonb, $12, $13, $14, $15, $16::jsonb
    )
  `, [
    request.sourceId,
    request.sourceUrl,
    request.objectKey,
    inspection.sha256,
    inspection.bytes,
    request.uncompressedBytes ?? null,
    request.contentType ?? null,
    request.etag ?? null,
    request.sourceLastModifiedAt ?? null,
    request.fetchedAt,
    JSON.stringify(request.snapshotMetadata),
    request.adapterPackage,
    request.adapterVersion,
    inspection.filePath,
    request.strict,
    JSON.stringify({ publication: request.publication, sensitivity: request.sensitivity }),
  ]);
  const row = result.rows[0];
  if (!row) throw new Error("Postgres did not return the enqueued snapshot import.");
  return mapEnqueuedImport(row, inspection);
}

function assertAllowedSourceUrl(value: string, allowedHosts: readonly string[]): void {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Snapshot source URL must use HTTPS.");
  const hosts = new Set(allowedHosts.map((host) => host.toLowerCase()));
  if (!hosts.has(url.hostname.toLowerCase())) throw new Error(`Snapshot source host ${url.hostname} is not allowlisted.`);
  if (url.username || url.password) throw new Error("Snapshot source URL cannot include credentials.");
}

function assertSafeObjectKey(value: string): void {
  if (value.startsWith("/") || value.endsWith("/") || value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Snapshot object key must be a relative, normalized object path.");
  }
}

function mapEnqueuedImport(row: Record<string, unknown>, inspection: SnapshotFileInspection): EnqueuedSnapshotImport {
  return {
    snapshotDatabaseId: safeInteger(row.snapshot_database_id, "snapshot database ID"),
    snapshotPublicId: requiredString(row.snapshot_public_id, "snapshot public ID"),
    jobDatabaseId: safeInteger(row.job_database_id, "job database ID"),
    jobPublicId: requiredString(row.job_public_id, "job public ID"),
    jobStatus: requiredString(row.job_status, "job status"),
    snapshotCreated: requiredBoolean(row.snapshot_created, "snapshot created"),
    jobCreated: requiredBoolean(row.job_created, "job created"),
    ...inspection,
  };
}

function safeInteger(value: unknown, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`Postgres returned an invalid ${name}.`);
  return parsed;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Postgres returned an invalid ${name}.`);
  return value;
}

function requiredBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Postgres returned an invalid ${name}.`);
  return value;
}
