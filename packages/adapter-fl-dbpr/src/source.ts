import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade-registry/core";
import { FL_DBPR_CONSTRUCTION_SOURCE_ID, FL_DBPR_CONSTRUCTION_SOURCE_URL, FL_DBPR_SOURCE_ENTRY } from "./constants.js";
import type { DbprConstructionRow } from "./map.js";
import { streamConstructionCsvFile } from "./parse.js";
import { mapOccupationToTradeCategory, normalizeDbprStatus } from "./normalize.js";

export const floridaDbprConstructionAdapter: TradeLicenseSourceAdapter = {
  sourceId: FL_DBPR_CONSTRUCTION_SOURCE_ID,
  async getSourceMetadata() {
    return FL_DBPR_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Local-file adapter is available. Live source availability is checked only when callers explicitly opt into network sync.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The Florida DBPR adapter requires a local filePath for adapter streaming.");
    }

    yield* streamConstructionCsvFile({
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
    return normalizeFloridaDbprConstructionRecord(raw);
  },
};

export function normalizeFloridaDbprConstructionRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as DbprConstructionRow;
  const status = normalizeDbprStatus({
    primaryStatusCode: row.primaryStatusCode,
    secondaryStatusCode: row.secondaryStatusCode,
    expirationDate: row.expirationDate,
  });
  const typeCode = row.classCode ? `${row.occupationCode}:${row.classCode}` : row.occupationCode;
  const classificationCodes = [row.occupationCode, row.classCode].filter((value): value is string => Boolean(value));
  const classificationLabels = [row.occupationDescription, row.classCodeDescription].filter((value): value is string => Boolean(value));
  const tradeCategory = mapOccupationToTradeCategory(row.occupationCode);

  const record: CanonicalTradeLicenseRecord = {
    sourceId: FL_DBPR_CONSTRUCTION_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "FL",
      county: row.countyCode,
    },
    agency: FL_DBPR_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? FL_DBPR_CONSTRUCTION_SOURCE_URL,
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: FL_DBPR_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "Source coverage and exclusions must be verified against official documentation before generated datasets are redistributed.",
        "No matching record in this source is not proof that a license does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.alternateLicenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.alternateLicenseNumber) ?? row.alternateLicenseNumberNormalized,
      alternateLicenseNumbers: row.licenseNumber === row.alternateLicenseNumber ? [] : [row.licenseNumber],
      typeCode,
      typeLabel: row.occupationDescription,
      classificationCodes,
      classificationLabels,
      tradeCategories: [tradeCategory],
    },
    identity: {
      businessName: row.doingBusinessAsName,
      dbaName: row.doingBusinessAsName,
      licenseeName: row.licenseeName,
      personnel: row.licenseeName ? [{ name: row.licenseeName, role: "unknown", raw: { sourceField: "licenseeName" } }] : [],
    },
    status: {
      rawStatusCode: row.primaryStatusCode,
      rawStatusLabel: row.primaryStatusLabel,
      secondaryRawStatusCode: row.secondaryStatusCode,
      secondaryRawStatusLabel: row.secondaryStatusLabel,
      normalized: status.normalized,
      isCurrent: status.isCurrent,
    },
    dates: {
      originalLicensureDate: row.originalLicensureDate,
      effectiveDate: row.effectiveDate,
      expirationDate: row.expirationDate,
      renewalPeriod: row.renewalPeriod,
    },
    contact: {
      addresses: [
        {
          type: "public_record",
          line1: row.addressLine1,
          line2: row.addressLine2,
          line3: row.addressLine3,
          city: row.city,
          state: row.state,
          postalCode: row.zipCode,
          county: row.countyCode,
          country: "US",
          raw: {
            addressLine1: row.addressLine1,
            addressLine2: row.addressLine2,
            addressLine3: row.addressLine3,
            city: row.city,
            state: row.state,
            zipCode: row.zipCode,
            countyCode: row.countyCode,
          },
        },
      ],
    },
    compliance: {},
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}
