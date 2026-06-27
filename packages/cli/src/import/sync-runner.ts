import { isAbsolute, resolve } from "node:path";
import {
  canonicalTradeLicenseRecordSchema,
  type CanonicalTradeLicenseRecord,
  type ImportStats,
  type RemoteSnapshotMetadata,
  type TradeLicenseSourceAdapter,
} from "@opentrade/core";
import type { SyncFormat } from "./export.js";
import { writeCanonicalRecords } from "./export.js";
import { OpenTradeSqliteCache } from "@opentrade/storage-sqlite";

export type SyncResult = {
  sourceId: string;
  adapterMaturity?: string;
  outputPath?: string;
  cachePath?: string;
  format: SyncFormat;
  stats: ImportStats;
  remoteSnapshot?: RemoteSnapshotMetadata;
  warnings: string[];
  errors: SyncRecordError[];
};

export type SyncRecordError = {
  rowNumber?: number;
  recordFingerprint?: string;
  message: string;
};

export async function runAdapterSync(input: {
  adapter: TradeLicenseSourceAdapter;
  rootDir: string;
  filePath: string;
  outPath?: string;
  cachePath?: string;
  format: SyncFormat;
  sourceLastModifiedAt?: string | null;
  fetchedAt?: string;
  sourceUrl?: string;
  remoteSnapshot?: RemoteSnapshotMetadata;
  strict?: boolean;
}): Promise<SyncResult> {
  const metadata = await input.adapter.getSourceMetadata();
  const startedAt = new Date().toISOString();
  const stats: ImportStats = {
    sourceId: input.adapter.sourceId,
    startedAt,
    rawRecordCount: 0,
    normalizedRecordCount: 0,
    warningCount: 0,
    errorCount: 0,
  };
  const warnings: string[] = [];
  const errors: SyncRecordError[] = [];
  const records: CanonicalTradeLicenseRecord[] = [];

  for await (const rawRecord of input.adapter.streamRawRecords({
    filePath: resolveFromRoot(input.rootDir, input.filePath),
    sourceUrl: input.sourceUrl,
    sourceLastModifiedAt: input.sourceLastModifiedAt,
    fetchedAt: input.fetchedAt,
  })) {
    stats.rawRecordCount += 1;
    stats.warningCount += rawRecord.warnings?.length ?? 0;
    warnings.push(...(rawRecord.warnings?.map((warning) => warning.message) ?? []));
    try {
      const record = await input.adapter.normalize(rawRecord);
      records.push(canonicalTradeLicenseRecordSchema.parse(record));
      stats.normalizedRecordCount += 1;
    } catch (error) {
      stats.errorCount += 1;
      const message = `Failed to normalize record ${rawRecord.rowNumber ?? stats.rawRecordCount}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push({
        rowNumber: rawRecord.rowNumber,
        recordFingerprint: rawRecord.fingerprint,
        message,
      });

      if (input.strict) {
        throw Object.assign(new Error(message), { exitCode: 1 });
      }
    }
  }

  stats.finishedAt = new Date().toISOString();

  const outputPath = input.outPath ? resolveFromRoot(input.rootDir, input.outPath) : undefined;
  if (outputPath) await writeCanonicalRecords({ outputPath, format: input.format, records });
  const cachePath = input.cachePath ? resolveFromRoot(input.rootDir, input.cachePath) : undefined;
  if (cachePath) {
    const cache = await OpenTradeSqliteCache.open({ filePath: cachePath });
    try {
      cache.importRecords(records, { importRunId: input.remoteSnapshot?.sha256 ?? undefined });
    } finally {
      await cache.close();
    }
  }

  return {
    sourceId: input.adapter.sourceId,
    adapterMaturity: metadata.adapterMaturity,
    outputPath,
    cachePath,
    format: input.format,
    stats,
    remoteSnapshot: input.remoteSnapshot,
    warnings,
    errors,
  };
}

function resolveFromRoot(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}
