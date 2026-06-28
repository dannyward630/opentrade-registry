import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber, type CanonicalTradeLicenseRecord, type RawSourceRecord, type SourceAvailability, type TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import { AZ_ROC_CONTRACTORS_SOURCE_ID, AZ_ROC_CONTRACTORS_SOURCE_URL, AZ_ROC_SOURCE_ENTRY } from "./constants.js";
import type { ArizonaRocRow } from "./map.js";
import { mapArizonaRocTradeCategories, normalizeArizonaRocStatus } from "./normalize.js";
import { streamArizonaRocCsvFile } from "./parse.js";

export const arizonaRocContractorsAdapter: TradeLicenseSourceAdapter = {
  sourceId: AZ_ROC_CONTRACTORS_SOURCE_ID,
  async getSourceMetadata() { return AZ_ROC_SOURCE_ENTRY; },
  async checkAvailability(): Promise<SourceAvailability> { return { ok: true, checkedAt: new Date().toISOString(), message: "Local-file parsing is available; network downloads require an explicit current official URL and --allow-network." }; },
  async *streamRawRecords(options) {
    if (!options.filePath) throw new Error("The Arizona ROC adapter requires a local filePath.");
    yield* streamArizonaRocCsvFile({ filePath: options.filePath, sourceUrl: options.sourceUrl, fetchedAt: options.fetchedAt, sourceLastModifiedAt: options.sourceLastModifiedAt, limit: options.limit, signal: options.signal, startAfterRow: options.startAfterRow, onError: options.onError });
  },
  async normalize(raw) { return normalizeArizonaRocRecord(raw); },
};

export function normalizeArizonaRocRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as ArizonaRocRow;
  const status = normalizeArizonaRocStatus(row);
  return canonicalTradeLicenseRecordSchema.parse({
    sourceId: AZ_ROC_CONTRACTORS_SOURCE_ID,
    jurisdiction: { country: "US", state: "AZ" },
    agency: AZ_ROC_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? AZ_ROC_CONTRACTORS_SOURCE_URL,
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: "unknown",
      caveats: [
        "The posting list is a dated current-contractor export and is not a historical license register.",
        "Arizona ROC says to confirm posting information with the agency before taking action because records can change after publication.",
        "No matching record in this file is not proof that a license does not exist or never existed.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeCode: row.classificationCode,
      typeLabel: row.classType,
      classificationCodes: row.classificationCode ? [row.classificationCode] : [],
      classificationLabels: row.classificationLabel ? [row.classificationLabel] : [],
      tradeCategories: mapArizonaRocTradeCategories(row),
    },
    identity: {
      businessName: row.businessName,
      dbaName: row.dbaName,
      licenseeName: row.qualifyingParty,
      personnel: row.qualifyingParty ? [{ name: row.qualifyingParty, role: "qualifier", raw: { sourceField: "Qualifying Party" } }] : [],
    },
    status: { rawStatusLabel: row.status, normalized: status.normalized, isCurrent: status.isCurrent },
    dates: { issueDate: row.issueDate, expirationDate: row.expirationDate },
    contact: { addresses: [{ type: "business", line1: row.address, city: row.city, state: row.state, postalCode: row.zip, country: "US", raw: { address: row.address, city: row.city, state: row.state, zip: row.zip } }] },
    raw: { record: row.raw, fingerprint: raw.fingerprint || row.fingerprint },
  });
}
