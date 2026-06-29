import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade-registry/core";
import { WA_LNI_CONTRACTORS_SOURCE_ID, WA_LNI_CONTRACTORS_SOURCE_URL, WA_LNI_SOURCE_ENTRY } from "./constants.js";
import type { WashingtonLniRow } from "./map.js";
import { streamWashingtonLniCsvFile } from "./parse.js";
import { mapWashingtonLniTradeCategories, normalizeWashingtonLniStatus } from "./normalize.js";

export const washingtonLniContractorsAdapter: TradeLicenseSourceAdapter = {
  sourceId: WA_LNI_CONTRACTORS_SOURCE_ID,
  async getSourceMetadata() {
    return WA_LNI_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Official-shape CSV parsing is available; registry orchestration owns explicit network retrieval.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The Washington L&I adapter requires a local filePath.");
    }

    yield* streamWashingtonLniCsvFile({
      filePath: options.filePath,
      sourceUrl: options.sourceUrl,
      fetchedAt: options.fetchedAt,
      sourceLastModifiedAt: options.sourceLastModifiedAt,
      limit: options.limit,
      signal: options.signal,
      startAfterRow: options.startAfterRow,
      onError: options.onError,
    });
  },
  async normalize(raw) {
    return normalizeWashingtonLniRecord(raw);
  },
};

export function normalizeWashingtonLniRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as WashingtonLniRow;
  const status = normalizeWashingtonLniStatus(row);
  const classifications = [
    [row.specialtyCode1, row.specialtyLabel1],
    [row.specialtyCode2, row.specialtyLabel2],
  ].filter(([code, label]) => code || label);
  const record: CanonicalTradeLicenseRecord = {
    sourceId: WA_LNI_CONTRACTORS_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "WA",
    },
    agency: WA_LNI_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? WA_LNI_CONTRACTORS_SOURCE_URL,
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: WA_LNI_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "Washington L&I contractor data does not represent every local permit, business registration, or trade authorization in Washington.",
        "No matching record in this source is not proof that a license does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeCode: row.licenseTypeCode,
      typeLabel: row.licenseTypeLabel,
      classificationCodes: classifications.map(([code]) => code).filter((value): value is string => Boolean(value)),
      classificationLabels: classifications.map(([, label]) => label).filter((value): value is string => Boolean(value)),
      tradeCategories: mapWashingtonLniTradeCategories(row),
    },
    identity: {
      businessName: row.businessName,
      licenseeName: row.primaryPrincipalName,
      personnel: row.primaryPrincipalName ? [{ name: row.primaryPrincipalName, role: "owner", raw: { sourceField: "PrimaryPrincipalName" } }] : [],
    },
    status: {
      rawStatusCode: row.statusCode,
      rawStatusLabel: row.statusLabel,
      normalized: status.normalized,
      isCurrent: status.isCurrent,
    },
    dates: {
      effectiveDate: row.effectiveDate,
      expirationDate: row.expirationDate,
    },
    contact: {
      addresses: [
        {
          type: "business",
          line1: row.address1,
          line2: row.address2,
          city: row.city,
          state: row.state,
          postalCode: row.zip,
          country: "US",
          raw: {
            address1: row.address1,
            address2: row.address2,
            city: row.city,
            state: row.state,
            zip: row.zip,
          },
        },
      ],
      phone: row.phoneNumber,
    },
    compliance: {
      workersComp: row.ubi ? { ubi: row.ubi } : undefined,
    },
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}
