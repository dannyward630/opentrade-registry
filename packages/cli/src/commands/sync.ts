import { isAbsolute, resolve } from "node:path";
import type { CanonicalTradeLicenseRecord, ImportStats } from "@opentrade/core";
import { requireAdapter } from "../adapters.js";
import { parseSyncFormat, writeCanonicalRecords } from "../import/export.js";

export async function syncSource(input: {
  rootDir: string;
  sourceId: string;
  file?: string;
  out?: string;
  format?: string;
  url?: string;
  allowNetwork?: boolean;
  sourceLastModifiedAt?: string;
  json?: boolean;
}) {
  const adapter = requireAdapter(input.sourceId, "sync");

  if (input.url || input.allowNetwork) {
    throw Object.assign(
      new Error("Network sync is planned for a future release. v0.1 requires --file and does not download source data."),
      { exitCode: 3 },
    );
  }

  if (!input.file) {
    throw Object.assign(new Error("Missing --file for local-file sync."), { exitCode: 2 });
  }

  if (!input.out) {
    throw Object.assign(new Error("Missing --out for sync output."), { exitCode: 2 });
  }

  const format = parseSyncFormat(input.format);
  const startedAt = new Date().toISOString();
  const stats: ImportStats = {
    sourceId: input.sourceId,
    startedAt,
    rawRecordCount: 0,
    normalizedRecordCount: 0,
    warningCount: 0,
    errorCount: 0,
  };

  const records: CanonicalTradeLicenseRecord[] = [];
  for await (const rawRecord of adapter.streamRawRecords({
    filePath: resolveFromRoot(input.rootDir, input.file),
    sourceLastModifiedAt: input.sourceLastModifiedAt,
  })) {
    stats.rawRecordCount += 1;
    stats.warningCount += rawRecord.warnings?.length ?? 0;
    records.push(await adapter.normalize(rawRecord));
    stats.normalizedRecordCount += 1;
  }

  stats.finishedAt = new Date().toISOString();

  const outputPath = resolveFromRoot(input.rootDir, input.out);
  await writeCanonicalRecords({ outputPath, format, records });

  const result = {
    sourceId: input.sourceId,
    outputPath,
    format,
    stats,
  };
  console.log(input.json ? JSON.stringify(result, null, 2) : `Wrote ${records.length} ${format.toUpperCase()} canonical records to ${outputPath}.`);
}

function resolveFromRoot(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}
