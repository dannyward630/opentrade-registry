import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CanonicalTradeLicenseRecord } from "@opentrade/core";

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
  await writeFile(input.outputPath, input.format === "jsonl" ? toJsonl(input.records) : toCsv(input.records), "utf8");
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
