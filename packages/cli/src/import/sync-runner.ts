import { isAbsolute, resolve } from "node:path";
import type { CanonicalTradeLicenseRecord, ImportStats, RemoteSnapshotMetadata, TradeLicenseSourceAdapter } from "@opentrade/core";
import type { SyncFormat } from "./export.js";
import { writeCanonicalRecords } from "./export.js";

export type SyncResult = {
  sourceId: string;
  adapterMaturity?: string;
  outputPath: string;
  format: SyncFormat;
  stats: ImportStats;
  remoteSnapshot?: RemoteSnapshotMetadata;
  warnings: string[];
};

export async function runAdapterSync(input: {
  adapter: TradeLicenseSourceAdapter;
  rootDir: string;
  filePath: string;
  outPath: string;
  format: SyncFormat;
  sourceLastModifiedAt?: string | null;
  fetchedAt?: string;
  remoteSnapshot?: RemoteSnapshotMetadata;
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
  const records: CanonicalTradeLicenseRecord[] = [];

  for await (const rawRecord of input.adapter.streamRawRecords({
    filePath: resolveFromRoot(input.rootDir, input.filePath),
    sourceLastModifiedAt: input.sourceLastModifiedAt,
    fetchedAt: input.fetchedAt,
  })) {
    stats.rawRecordCount += 1;
    stats.warningCount += rawRecord.warnings?.length ?? 0;
    warnings.push(...(rawRecord.warnings?.map((warning) => warning.message) ?? []));
    try {
      records.push(await input.adapter.normalize(rawRecord));
      stats.normalizedRecordCount += 1;
    } catch (error) {
      stats.errorCount += 1;
      throw Object.assign(
        new Error(`Failed to normalize record ${rawRecord.rowNumber ?? stats.rawRecordCount}: ${error instanceof Error ? error.message : String(error)}`),
        { exitCode: 1 },
      );
    }
  }

  stats.finishedAt = new Date().toISOString();

  const outputPath = resolveFromRoot(input.rootDir, input.outPath);
  await writeCanonicalRecords({ outputPath, format: input.format, records });

  return {
    sourceId: input.adapter.sourceId,
    adapterMaturity: metadata.adapterMaturity,
    outputPath,
    format: input.format,
    stats,
    remoteSnapshot: input.remoteSnapshot,
    warnings,
  };
}

function resolveFromRoot(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}
