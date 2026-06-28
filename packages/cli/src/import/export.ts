import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parseCanonicalTradeLicenseRecord, type CanonicalTradeLicenseRecord } from "@opentrade-registry/core";

export type SyncFormat = "jsonl" | "csv";

export function parseSyncFormat(value: string | undefined): SyncFormat {
  if (!value || value === "jsonl") {
    return "jsonl";
  }

  if (value === "csv") {
    return "csv";
  }

  throw Object.assign(new Error(`Unsupported sync format: ${value}. Use jsonl or csv.`), { exitCode: 2 });
}

export async function writeCanonicalRecords(input: {
  outputPath: string;
  format: SyncFormat;
  records: CanonicalTradeLicenseRecord[];
}): Promise<void> {
  await mkdir(dirname(input.outputPath), { recursive: true });
  const temporaryPath = join(dirname(input.outputPath), `.${basename(input.outputPath)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, input.format === "jsonl" ? toJsonl(input.records) : toCsv(input.records), "utf8");
    await rename(temporaryPath, input.outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export function toJsonl(records: CanonicalTradeLicenseRecord[]): string {
  return `${records.map((record) => JSON.stringify(parseCanonicalTradeLicenseRecord(record))).join("\n")}\n`;
}

export function toCsv(records: CanonicalTradeLicenseRecord[]): string {
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
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (!/[",\n\r]/.test(safeValue)) {
    return safeValue;
  }

  return `"${safeValue.replaceAll("\"", "\"\"")}"`;
}
