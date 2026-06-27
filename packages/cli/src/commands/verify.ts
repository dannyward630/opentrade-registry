import { isAbsolute, resolve } from "node:path";
import { FL_DBPR_CONSTRUCTION_SOURCE_ID } from "@opentrade/adapter-fl-dbpr";
import {
  normalizeLicenseNumber,
  type CanonicalTradeLicenseRecord,
  type TradeLicenseVerificationResult,
  type VerificationWarning,
} from "@opentrade/core";
import { requireAdapter } from "../adapters.js";
import { downloadSourceToTempFile } from "../import/network.js";
import { OpenTradeSqliteCache } from "@opentrade/storage-sqlite";

export async function verifyLicense(input: {
  rootDir: string;
  sourceId?: string;
  file?: string;
  cache?: string;
  url?: string;
  allowNetwork?: boolean;
  sourceLastModifiedAt?: string;
  license?: string;
  json?: boolean;
}) {
  const sourceId = input.sourceId ?? FL_DBPR_CONSTRUCTION_SOURCE_ID;
  const adapter = requireAdapter(sourceId, "verify");
  const metadata = await adapter.getSourceMetadata();
  const jurisdiction = `${metadata.jurisdiction.country}-${metadata.jurisdiction.state}`;

  if (input.url && !input.allowNetwork) {
    throw Object.assign(new Error("Network verification requires --allow-network. Use --file for local verification."), { exitCode: 3 });
  }

  if (input.allowNetwork && !input.url) {
    throw Object.assign(new Error("Missing --url for network verification."), { exitCode: 2 });
  }

  const normalizedQuery = normalizeLicenseNumber(input.license);
  if (!normalizedQuery) {
    const result = buildVerificationResult({
      sourceId,
      jurisdiction,
      license: input.license,
      result: "missing_required_input",
      records: [],
      reasons: [{ code: "missing_license_number", message: "Missing or invalid --license value." }],
    });
    printVerificationResult(result, input.json);
    throw Object.assign(new Error("Missing or invalid --license value."), { exitCode: 2, alreadyReported: true });
  }

  if (input.cache) {
    if (input.file || input.url) throw Object.assign(new Error("Choose exactly one verification input: --file, --url, or --cache."), { exitCode: 2 });
    const cache = await OpenTradeSqliteCache.open({ filePath: resolveFromRoot(input.rootDir, input.cache), create: false });
    try {
      const result = cache.verify(sourceId, jurisdiction, normalizedQuery);
      printVerificationResult(result, input.json);
      if (result.result === "not_found") throw Object.assign(new Error("No matching record was found in this local cache as of the checked time."), { exitCode: 4, alreadyReported: true });
      if (result.result === "ambiguous") throw Object.assign(new Error("Multiple matching records were found in this local cache."), { exitCode: 5, alreadyReported: true });
      return;
    } finally {
      await cache.close();
    }
  }

  if (!input.file && !input.url) {
    throw Object.assign(new Error("Missing verification input. Use --file, --url, or --cache."), { exitCode: 2 });
  }

  const downloaded = input.url ? await downloadSourceToTempFile(input.url) : null;

  try {
    await runVerification({
      rootDir: input.rootDir,
      filePath: downloaded?.filePath ?? input.file!,
      sourceLastModifiedAt: input.sourceLastModifiedAt ?? downloaded?.metadata.lastModifiedAt,
      fetchedAt: downloaded?.metadata.fetchedAt,
      sourceUrl: downloaded?.metadata.sourceUrl,
      adapter,
      sourceId,
      jurisdiction,
      license: input.license,
      normalizedQuery,
      json: input.json,
    });
  } finally {
    await downloaded?.cleanup();
  }
}

async function runVerification(input: {
  rootDir: string;
  filePath: string;
  sourceLastModifiedAt?: string | null;
  fetchedAt?: string;
  sourceUrl?: string;
  adapter: ReturnType<typeof requireAdapter>;
  sourceId: string;
  jurisdiction: string;
  license?: string;
  normalizedQuery: string;
  json?: boolean;
}) {
  const candidates: CanonicalTradeLicenseRecord[] = [];
  const warnings: VerificationWarning[] = [];
  let skippedRecordCount = 0;
  for await (const rawRecord of input.adapter.streamRawRecords({
    filePath: resolveFromRoot(input.rootDir, input.filePath),
    sourceLastModifiedAt: input.sourceLastModifiedAt,
    fetchedAt: input.fetchedAt,
    sourceUrl: input.sourceUrl,
  })) {
    for (const warning of rawRecord.warnings ?? []) {
      warnings.push({
        code: warning.code,
        message: warning.message,
        rowNumber: rawRecord.rowNumber,
        recordFingerprint: warning.recordFingerprint ?? rawRecord.fingerprint,
      });
    }

    let record: CanonicalTradeLicenseRecord;
    try {
      record = await input.adapter.normalize(rawRecord);
    } catch (error) {
      skippedRecordCount += 1;
      warnings.push({
        code: "record_normalization_failed",
        message: `Skipped record ${rawRecord.rowNumber ?? "unknown"} during verification: ${error instanceof Error ? error.message : String(error)}`,
        rowNumber: rawRecord.rowNumber,
        recordFingerprint: rawRecord.fingerprint,
      });
      continue;
    }

    const normalizedCandidates = new Set([
      normalizeLicenseNumber(record.license.licenseNumber),
      record.license.licenseNumberNormalized,
      ...(record.license.alternateLicenseNumbers ?? []).map((value: string) => normalizeLicenseNumber(value)),
    ]);

    if (normalizedCandidates.has(input.normalizedQuery)) {
      candidates.push(record);
    }
  }

  const result = buildVerificationResult({
    sourceId: input.sourceId,
    jurisdiction: input.jurisdiction,
    license: input.license,
    result:
      candidates.length === 0
        ? "not_found"
        : candidates.length === 1 && skippedRecordCount > 0
          ? "matched_with_warnings"
          : candidates.length === 1
            ? "matched"
            : "ambiguous",
    records: candidates,
    warnings,
  });

  printVerificationResult(result, input.json);

  if (candidates.length === 0) {
    throw Object.assign(new Error("No matching record was found in this source as of the checked time."), { exitCode: 4, alreadyReported: true });
  }

  if (candidates.length > 1) {
    throw Object.assign(new Error("Multiple matching records were found in this source."), { exitCode: 5, alreadyReported: true });
  }
}

function buildVerificationResult(input: {
  sourceId: string;
  jurisdiction: string;
  license?: string;
  result: TradeLicenseVerificationResult["result"];
  records: CanonicalTradeLicenseRecord[];
  warnings?: VerificationWarning[];
  reasons?: TradeLicenseVerificationResult["reasons"];
}): TradeLicenseVerificationResult {
  return {
    sourceId: input.sourceId,
    jurisdiction: input.jurisdiction,
    query: {
      licenseNumber: input.license,
    },
    result: input.result,
    matchedRecord: input.records.length === 1 ? input.records[0] : undefined,
    candidateRecords: input.records.length > 1 ? input.records : undefined,
    warnings: input.warnings ?? [],
    reasons:
      input.reasons ??
      (input.records.length === 0
        ? [{ code: "no_match_in_source", message: "No matching record was found in this source as of the checked time." }]
        : []),
    checkedAt: new Date().toISOString(),
  };
}

function printVerificationResult(result: TradeLicenseVerificationResult, json: boolean | undefined) {
  const records = result.candidateRecords ?? (result.matchedRecord ? [result.matchedRecord] : []);
  const message =
    result.result === "missing_required_input"
      ? result.reasons[0]?.message ?? "Missing required input."
      : result.result === "not_found"
        ? "No matching record was found in this source as of the checked time."
        : result.result === "matched"
          ? "One matching record was found in this source."
          : result.result === "ambiguous"
            ? "Multiple matching records were found in this source."
            : "Verification completed.";

  if (json) {
    console.log(JSON.stringify({ ...result, message }, null, 2));
    return;
  }

  console.log(`${result.result}: ${message}`);
  if (result.warnings.length > 0) {
    console.log("warnings:");
    for (const warning of result.warnings) {
      console.log(`- ${warning.code}: ${warning.message}`);
    }
  }
  for (const record of records) {
    console.log(`${record.license.licenseNumber}\t${record.status.normalized}\t${record.identity.licenseeName ?? ""}`);
  }
}

function resolveFromRoot(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}
