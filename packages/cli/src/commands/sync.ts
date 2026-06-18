import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { floridaDbprConstructionAdapter, FL_DBPR_CONSTRUCTION_SOURCE_ID } from "@opentrade/adapter-fl-dbpr";
import type { CanonicalTradeLicenseRecord, ImportStats } from "@opentrade/core";

type SyncFormat = "jsonl" | "csv";

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
  if (input.sourceId !== FL_DBPR_CONSTRUCTION_SOURCE_ID) {
    throw Object.assign(new Error(`Source is not supported by v0.1 sync: ${input.sourceId}`), { exitCode: 2 });
  }

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
  for await (const rawRecord of floridaDbprConstructionAdapter.streamRawRecords({
    filePath: resolveFromRoot(input.rootDir, input.file),
    sourceLastModifiedAt: input.sourceLastModifiedAt,
  })) {
    stats.rawRecordCount += 1;
    stats.warningCount += rawRecord.warnings?.length ?? 0;
    records.push(await floridaDbprConstructionAdapter.normalize(rawRecord));
    stats.normalizedRecordCount += 1;
  }

  stats.finishedAt = new Date().toISOString();

  const outputPath = resolveFromRoot(input.rootDir, input.out);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, format === "jsonl" ? toJsonl(records) : toCsv(records), "utf8");

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

function parseSyncFormat(value: string | undefined): SyncFormat {
  if (!value || value === "jsonl") {
    return "jsonl";
  }

  if (value === "csv") {
    return "csv";
  }

  throw Object.assign(new Error(`Unsupported sync format: ${value}. Use jsonl or csv.`), { exitCode: 2 });
}

function toJsonl(records: CanonicalTradeLicenseRecord[]): string {
  return `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
}

function toCsv(records: CanonicalTradeLicenseRecord[]): string {
  const header = [
    "sourceId",
    "licenseNumber",
    "licenseNumberNormalized",
    "typeLabel",
    "tradeCategories",
    "status",
    "expirationDate",
    "licenseeName",
    "dbaName",
    "sourceUrl",
    "fetchedAt",
    "fingerprint",
  ];
  const rows = records.map((record) => [
    record.sourceId,
    record.license.licenseNumber,
    record.license.licenseNumberNormalized,
    record.license.typeLabel ?? "",
    record.license.tradeCategories?.join("|") ?? "",
    record.status.normalized,
    record.dates.expirationDate ?? "",
    record.identity.licenseeName ?? "",
    record.identity.dbaName ?? "",
    record.source.sourceUrl,
    record.source.fetchedAt,
    record.raw.fingerprint,
  ]);

  return `${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function csvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll("\"", "\"\"")}"`;
}
