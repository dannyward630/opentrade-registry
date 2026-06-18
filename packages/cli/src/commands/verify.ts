import { isAbsolute, resolve } from "node:path";
import { floridaDbprConstructionAdapter, FL_DBPR_CONSTRUCTION_SOURCE_ID } from "@opentrade/adapter-fl-dbpr";
import { normalizeLicenseNumber, type CanonicalTradeLicenseRecord, type TradeLicenseVerificationResult } from "@opentrade/core";

export async function verifyLicense(input: { rootDir: string; sourceId?: string; file?: string; license?: string; json?: boolean }) {
  const sourceId = input.sourceId ?? FL_DBPR_CONSTRUCTION_SOURCE_ID;
  if (sourceId !== FL_DBPR_CONSTRUCTION_SOURCE_ID) {
    throw Object.assign(new Error(`Source is not supported by v0.1 verify: ${sourceId}`), { exitCode: 2 });
  }

  if (!input.file) {
    throw Object.assign(new Error("Missing --file for local-file verification."), { exitCode: 2 });
  }

  const normalizedQuery = normalizeLicenseNumber(input.license);
  if (!normalizedQuery) {
    const result = buildVerificationResult({
      sourceId,
      license: input.license,
      result: "missing_required_input",
      records: [],
      reasons: [{ code: "missing_license_number", message: "Missing or invalid --license value." }],
    });
    printVerificationResult(result, input.json);
    throw Object.assign(new Error("Missing or invalid --license value."), { exitCode: 2, alreadyReported: true });
  }

  const candidates: CanonicalTradeLicenseRecord[] = [];
  for await (const rawRecord of floridaDbprConstructionAdapter.streamRawRecords({ filePath: resolveFromRoot(input.rootDir, input.file) })) {
    const record = await floridaDbprConstructionAdapter.normalize(rawRecord);
    const normalizedCandidates = new Set([
      normalizeLicenseNumber(record.license.licenseNumber),
      record.license.licenseNumberNormalized,
      ...(record.license.alternateLicenseNumbers ?? []).map((value: string) => normalizeLicenseNumber(value)),
    ]);

    if (normalizedCandidates.has(normalizedQuery)) {
      candidates.push(record);
    }
  }

  const result = buildVerificationResult({
    sourceId,
    license: input.license,
    result: candidates.length === 0 ? "not_found" : candidates.length === 1 ? "matched" : "ambiguous",
    records: candidates,
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
  license?: string;
  result: TradeLicenseVerificationResult["result"];
  records: CanonicalTradeLicenseRecord[];
  reasons?: TradeLicenseVerificationResult["reasons"];
}): TradeLicenseVerificationResult {
  return {
    sourceId: input.sourceId,
    jurisdiction: "US-FL",
    query: {
      licenseNumber: input.license,
    },
    result: input.result,
    matchedRecord: input.records.length === 1 ? input.records[0] : undefined,
    candidateRecords: input.records.length > 1 ? input.records : undefined,
    warnings: [],
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
  for (const record of records) {
    console.log(`${record.license.licenseNumber}\t${record.status.normalized}\t${record.identity.licenseeName ?? ""}`);
  }
}

function resolveFromRoot(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}
