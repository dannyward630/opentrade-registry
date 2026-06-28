import { isAbsolute, resolve } from "node:path";
import { type ImportStats, type RemoteSnapshotMetadata, type TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import type { SyncFormat } from "./export.js";
import { writeCanonicalRecords } from "./export.js";
import { OpenTradeSqliteCache } from "@opentrade-registry/storage-sqlite";
import type { SqliteImportRun } from "@opentrade-registry/storage-sqlite";
import { OpenTradeRegistry } from "@opentrade-registry/registry";

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
  importRun?: SqliteImportRun;
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
  resumable?: boolean;
  checkpointInterval?: number;
  resumeFromRunId?: string;
}): Promise<SyncResult> {
  const outputPath = input.outPath ? resolveFromRoot(input.rootDir, input.outPath) : undefined;
  const cachePath = input.cachePath ? resolveFromRoot(input.rootDir, input.cachePath) : undefined;
  const cache = cachePath ? await OpenTradeSqliteCache.open({ filePath: cachePath }) : undefined;
  try {
    const registry = new OpenTradeRegistry([input.adapter]);
    const result = await registry.sync({
      sourceId: input.adapter.sourceId,
      input: {
        mode: "file",
        filePath: resolveFromRoot(input.rootDir, input.filePath),
        sourceUrl: input.sourceUrl,
        sourceLastModifiedAt: input.sourceLastModifiedAt,
        fetchedAt: input.fetchedAt,
      },
      cache,
      collectRecords: Boolean(outputPath),
      strict: input.strict,
      importRunId: input.remoteSnapshot?.sha256 ?? undefined,
      resumable: input.resumable,
      checkpointInterval: input.checkpointInterval,
      resumeFromRunId: input.resumeFromRunId,
    });
    if (result.status !== "completed") {
      const message = result.errors.find((error) => error.code === "record_normalization_failed")?.message
        ?? result.errors.at(-1)?.message
        ?? `Sync failed for ${input.adapter.sourceId}.`;
      throw Object.assign(new Error(message), { exitCode: 1 });
    }

    if (outputPath) await writeCanonicalRecords({ outputPath, format: input.format, records: result.records ?? [] });

    return {
      sourceId: input.adapter.sourceId,
      adapterMaturity: result.adapterMaturity,
      outputPath,
      cachePath,
      format: input.format,
      stats: result.stats,
      remoteSnapshot: input.remoteSnapshot,
      warnings: result.warnings.map((warning) => warning.message),
      errors: result.errors.map((error) => ({ rowNumber: error.rowNumber, recordFingerprint: error.recordFingerprint, message: error.message })),
      importRun: result.importRun,
    };
  } finally {
    await cache?.close();
  }
}

function resolveFromRoot(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}
