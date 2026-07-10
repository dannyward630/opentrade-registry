import {
  assertPromotionReady,
  migrateCanonicalTradeLicenseRecordV1ToV2,
  parseCanonicalTradeLicenseRecord,
  type CanonicalTradeLicenseRecord,
  type CanonicalTradeLicenseRecordV2,
  type ImportManifest,
  type StagedImportRecord,
  type TradeLicenseSourceAdapter,
} from "@opentrade-registry/core";
import { z } from "zod";
import { inspectSnapshotFile, type SnapshotFileInspection } from "./snapshot-file.js";
import type { WorkerJobHandler, WorkerJobResult, WorkerSqlClient } from "./worker.js";

export const snapshotImportPayloadSchema = z.object({
  sourceId: z.string().min(1),
  filePath: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceSnapshotId: z.string().min(1),
  sourceSnapshotDatabaseId: z.number().int().positive(),
  fetchedAt: z.string().datetime(),
  sourceLastModifiedAt: z.string().datetime().nullable().optional(),
  adapterPackage: z.string().min(1),
  adapterVersion: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  strict: z.boolean().default(true),
  publication: z.object({
    disposition: z.enum(["allowed", "review_required", "restricted", "withheld"]),
    rawRecordDisposition: z.enum(["allowed", "review_required", "restricted", "withheld"]),
    reviewedAt: z.string().datetime(),
    notes: z.array(z.string().min(1)).optional(),
  }),
  sensitivity: z.object({
    level: z.enum(["business_only", "personal_contact", "sensitive_personal_data", "unknown"]),
    containsHomeAddress: z.union([z.boolean(), z.literal("unknown")]),
    containsPersonalEmail: z.union([z.boolean(), z.literal("unknown")]),
    containsPersonalPhone: z.union([z.boolean(), z.literal("unknown")]),
    redactedFields: z.array(z.string().min(1)).optional(),
  }),
});

export type SnapshotImportPayload = z.infer<typeof snapshotImportPayloadSchema>;

export type ImportManifestHandle = {
  databaseId: number;
  manifestId: string;
  sourceSnapshotDatabaseId: number;
};

export type StageRecordInput = {
  manifest: ImportManifestHandle;
  record: CanonicalTradeLicenseRecordV2;
  sourceRecordKey: string;
};

export interface ImportStore {
  createManifest(input: {
    sourceId: string;
    sourceSnapshotDatabaseId: number;
    adapterPackage: string;
    adapterVersion: string;
    startedAt: string;
    strict: boolean;
  }): Promise<ImportManifestHandle>;
  markProcessing(manifest: ImportManifestHandle): Promise<void>;
  stageRecord(input: StageRecordInput): Promise<{ recordVersionId: string }>;
  markValidated(input: {
    manifest: ImportManifestHandle;
    stats: ImportCounts;
    finishedAt: string;
    schemaDrift: string[];
    strict: boolean;
  }): Promise<void>;
  markFailed(input: {
    manifest: ImportManifestHandle;
    stats: ImportCounts;
    finishedAt: string;
    error: { code: string; message: string };
  }): Promise<void>;
  promote(manifest: ImportManifestHandle): Promise<void>;
}

export type ImportCounts = {
  rawRecordCount: number;
  normalizedRecordCount: number;
  duplicateRecordCount: number;
  warningCount: number;
  errorCount: number;
};

export type SnapshotImportHandlerOptions = {
  adapters: ReadonlyMap<string, TradeLicenseSourceAdapter>;
  store: ImportStore;
  now?: () => string;
  sourceRecordKey?: (record: CanonicalTradeLicenseRecord) => string;
  allowedSnapshotRoot: string;
  maxSnapshotBytes: number;
  inspectFile?: typeof inspectSnapshotFile;
};

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportValidationError";
  }
}

export function createSnapshotImportHandler(options: SnapshotImportHandlerOptions): WorkerJobHandler {
  const now = options.now ?? (() => new Date().toISOString());
  const sourceRecordKey = options.sourceRecordKey ?? defaultSourceRecordKey;

  return async (job, context): Promise<WorkerJobResult> => {
    const payload = snapshotImportPayloadSchema.parse(job.payload);
    if (payload.sourceId !== job.sourceId) {
      throw new ImportValidationError(`Import payload source ${payload.sourceId} does not match job source ${job.sourceId ?? "(missing)"}.`);
    }

    const adapter = options.adapters.get(payload.sourceId);
    if (!adapter) throw new ImportValidationError(`No adapter is registered for ${payload.sourceId}.`);

    await verifySnapshotFile(payload, options);

    const startedAt = now();
    const manifest = await options.store.createManifest({
      sourceId: payload.sourceId,
      sourceSnapshotDatabaseId: payload.sourceSnapshotDatabaseId,
      adapterPackage: payload.adapterPackage,
      adapterVersion: payload.adapterVersion,
      startedAt,
      strict: payload.strict,
    });
    await options.store.markProcessing(manifest);

    const counts: ImportCounts = {
      rawRecordCount: 0,
      normalizedRecordCount: 0,
      duplicateRecordCount: 0,
      warningCount: 0,
      errorCount: 0,
    };
    const warnings: string[] = [];
    const errors: string[] = [];
    const stagedRecords: StagedImportRecord[] = [];
    const seenKeys = new Set<string>();

    try {
      for await (const raw of adapter.streamRawRecords({
        filePath: payload.filePath,
        sourceUrl: payload.sourceUrl,
        sourceLastModifiedAt: payload.sourceLastModifiedAt,
        fetchedAt: payload.fetchedAt,
        signal: context.signal,
        strict: payload.strict,
        onError: (error) => {
          counts.errorCount += 1;
          errors.push(error.message);
        },
      })) {
        context.signal.throwIfAborted();
        counts.rawRecordCount += 1;
        counts.warningCount += raw.warnings?.length ?? 0;
        warnings.push(...(raw.warnings ?? []).map((warning) => warning.message));

        let v1Record: CanonicalTradeLicenseRecord;
        try {
          v1Record = parseCanonicalTradeLicenseRecord(await adapter.normalize(raw));
        } catch (error) {
          counts.errorCount += 1;
          errors.push(errorMessage(error));
          if (payload.strict) throw error;
          continue;
        }

        const key = sourceRecordKey(v1Record);
        if (seenKeys.has(key)) {
          counts.duplicateRecordCount += 1;
          warnings.push(`Skipped duplicate source record key ${key}.`);
          continue;
        }
        seenKeys.add(key);

        const record = migrateCanonicalTradeLicenseRecordV1ToV2(v1Record, {
          id: `${payload.sourceId}:${key}`,
          recordVersion: v1Record.raw.fingerprint,
          sourceSnapshotId: payload.sourceSnapshotId,
          observedAt: payload.fetchedAt,
          publication: payload.publication,
          sensitivity: payload.sensitivity,
        });
        const staged = await options.store.stageRecord({ manifest, record, sourceRecordKey: key });
        stagedRecords.push({ sourceId: payload.sourceId, sourceRecordKey: key, fingerprint: record.raw.fingerprint, recordVersionId: staged.recordVersionId });
        counts.normalizedRecordCount += 1;
        await context.heartbeat();
      }

      const finishedAt = now();
      const manifestContract: ImportManifest = {
        schemaVersion: "2.0",
        id: manifest.manifestId,
        sourceId: payload.sourceId,
        sourceSnapshotId: payload.sourceSnapshotId,
        adapterPackage: payload.adapterPackage,
        adapterVersion: payload.adapterVersion,
        status: "validated",
        ...counts,
        startedAt,
        finishedAt,
        schemaDrift: [],
        strictMode: payload.strict,
      };
      try {
        assertPromotionReady(manifestContract, stagedRecords);
      } catch (error) {
        throw new ImportValidationError(errorMessage(error));
      }

      await verifySnapshotFile(payload, options);

      await options.store.markValidated({ manifest, stats: counts, finishedAt, schemaDrift: [], strict: payload.strict });
      await options.store.promote(manifest);
      return {
        manifestId: manifest.manifestId,
        sourceId: payload.sourceId,
        rawRecordCount: counts.rawRecordCount,
        normalizedRecordCount: counts.normalizedRecordCount,
        duplicateRecordCount: counts.duplicateRecordCount,
        warningCount: counts.warningCount,
        errorCount: counts.errorCount,
        warnings,
        promoted: true,
      };
    } catch (error) {
      counts.errorCount = Math.max(counts.errorCount, errors.length);
      await options.store.markFailed({
        manifest,
        stats: counts,
        finishedAt: now(),
        error: { code: error instanceof ImportValidationError ? "import_validation_failed" : "import_handler_failed", message: errorMessage(error) },
      });
      throw error;
    }
  };
}

async function verifySnapshotFile(
  payload: SnapshotImportPayload,
  options: SnapshotImportHandlerOptions,
): Promise<SnapshotFileInspection> {
  const inspection = await (options.inspectFile ?? inspectSnapshotFile)({
    filePath: payload.filePath,
    allowedRoot: options.allowedSnapshotRoot,
    maxBytes: options.maxSnapshotBytes,
  });
  if (inspection.sha256 !== payload.sha256) {
    throw new ImportValidationError("Snapshot file SHA-256 does not match the registered snapshot.");
  }
  return inspection;
}

export function createPostgresImportStore(sql: WorkerSqlClient): ImportStore {
  return {
    async createManifest(input) {
      const result = await sql.query(`
        insert into opentrade.import_manifests (
          source_id, source_snapshot_id, schema_version, adapter_package, adapter_version, status, strict_mode, started_at
        ) values ($1, $2, '2.0', $3, $4, 'pending', $5, $6)
        returning id::text as database_id, public_id::text as manifest_id
      `, [input.sourceId, input.sourceSnapshotDatabaseId, input.adapterPackage, input.adapterVersion, input.strict, input.startedAt]);
      const row = result.rows[0];
      if (!row) throw new Error("Postgres did not return the created import manifest.");
      return {
        databaseId: safeInteger(row.database_id, "manifest database id"),
        manifestId: requiredString(row.manifest_id, "manifest id"),
        sourceSnapshotDatabaseId: input.sourceSnapshotDatabaseId,
      };
    },

    async markProcessing(manifest) {
      await sql.query("update opentrade.import_manifests set status = 'processing' where id = $1 and status = 'pending'", [manifest.databaseId]);
    },

    async stageRecord(input) {
      const record = input.record;
      const result = await sql.query(`
        insert into opentrade.record_versions (
          import_manifest_id, source_snapshot_id, source_id, source_record_key, record_version, schema_version,
          jurisdiction_state, license_number, license_number_normalized, business_name, licensee_name,
          normalized_status, trade_categories, observed_at, publication_disposition, sensitivity_level,
          fingerprint, canonical_record
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb)
        returning id::text as record_version_id
      `, [
        input.manifest.databaseId,
        input.manifest.sourceSnapshotDatabaseId,
        record.sourceId,
        input.sourceRecordKey,
        record.recordVersion,
        record.schemaVersion,
        record.jurisdiction.state,
        record.license.licenseNumber,
        record.license.licenseNumberNormalized,
        record.identity.businessName ?? null,
        record.identity.licenseeName ?? null,
        record.status.normalized,
        record.license.tradeCategories ?? [],
        record.observedAt,
        record.publication.disposition,
        record.sensitivity.level,
        record.raw.fingerprint,
        JSON.stringify(record),
      ]);
      const row = result.rows[0];
      if (!row) throw new Error("Postgres did not return the staged record version.");
      return { recordVersionId: requiredString(row.record_version_id, "record version id") };
    },

    async markValidated(input) {
      await sql.query(`
        update opentrade.import_manifests
        set status = 'validated', raw_record_count = $2, normalized_record_count = $3,
            duplicate_record_count = $4, warning_count = $5, error_count = $6,
            finished_at = $7, schema_drift = $8::jsonb, strict_mode = $9
        where id = $1 and status = 'processing'
      `, [input.manifest.databaseId, input.stats.rawRecordCount, input.stats.normalizedRecordCount, input.stats.duplicateRecordCount, input.stats.warningCount, input.stats.errorCount, input.finishedAt, JSON.stringify(input.schemaDrift), input.strict]);
    },

    async markFailed(input) {
      await sql.query(`
        update opentrade.import_manifests
        set status = 'failed', raw_record_count = $2, normalized_record_count = $3,
            duplicate_record_count = $4, warning_count = $5, error_count = $6,
            finished_at = $7, failure = $8::jsonb
        where id = $1 and status in ('pending', 'processing', 'validated')
      `, [input.manifest.databaseId, input.stats.rawRecordCount, input.stats.normalizedRecordCount, input.stats.duplicateRecordCount, input.stats.warningCount, input.stats.errorCount, input.finishedAt, JSON.stringify(input.error)]);
    },

    async promote(manifest) {
      await sql.query("select opentrade.promote_import($1)", [manifest.databaseId]);
    },
  };
}

function defaultSourceRecordKey(record: CanonicalTradeLicenseRecord): string {
  return record.license.licenseNumberNormalized;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Postgres returned an invalid ${label}.`);
  return value;
}

function safeInteger(value: unknown, label: string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`Postgres returned an invalid ${label}.`);
  return number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
