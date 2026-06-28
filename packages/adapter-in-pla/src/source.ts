import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade/core";
import { IN_PLA_PROFESSIONAL_LICENSES_SOURCE_ID, IN_PLA_PROFESSIONAL_LICENSES_SOURCE_URL, IN_PLA_SOURCE_ENTRY } from "./constants.js";
import type { IndianaPlaRow } from "./map.js";
import { mapIndianaPlaTradeCategory, normalizeIndianaPlaStatus } from "./normalize.js";
import { streamIndianaPlaCsvFile } from "./parse.js";

export const indianaPlaProfessionalLicensesAdapter: TradeLicenseSourceAdapter = {
  sourceId: IN_PLA_PROFESSIONAL_LICENSES_SOURCE_ID,
  async getSourceMetadata() {
    return IN_PLA_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Local fixture adapter is available. Live Indiana PLA MyLicense lookup, API, and paid download access are not implemented.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The Indiana PLA fixture adapter requires a local filePath.");
    }

    yield* streamIndianaPlaCsvFile({
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
    return normalizeIndianaPlaRecord(raw);
  },
};

export function normalizeIndianaPlaRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as IndianaPlaRow;
  const status = normalizeIndianaPlaStatus({ status: row.licenseStatus, expirationDate: row.expirationDate });
  const tradeCategory = mapIndianaPlaTradeCategory(row.licenseType, row.board);
  const record: CanonicalTradeLicenseRecord = {
    sourceId: IN_PLA_PROFESSIONAL_LICENSES_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "IN",
      county: row.county,
    },
    agency: IN_PLA_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? IN_PLA_PROFESSIONAL_LICENSES_SOURCE_URL,
      sourceType: "html_lookup",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: IN_PLA_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "Indiana PLA MyLicense spans many professions and is not limited to contractor or skilled-trade credentials.",
        "Indiana general contractor licensing is often local and is outside this fixture adapter's scope.",
        "No matching record in this source is not proof that a license, local registration, or authorization does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeCode: row.board,
      typeLabel: row.licenseType,
      classificationCodes: row.board ? [row.board] : [],
      classificationLabels: [row.licenseType, row.board].filter((value): value is string => Boolean(value)),
      tradeCategories: [tradeCategory],
    },
    identity: {
      businessName: row.name,
      dbaName: row.dbaName,
    },
    status: {
      rawStatusLabel: row.licenseStatus,
      normalized: status.normalized,
      isCurrent: status.isCurrent,
    },
    dates: {
      issueDate: row.issueDate,
      expirationDate: row.expirationDate,
    },
    contact: {
      addresses: [
        {
          type: "business",
          line1: row.addressLine1,
          line2: row.addressLine2,
          city: row.city,
          state: row.state,
          postalCode: row.zip,
          county: row.county,
          country: "US",
          raw: {
            addressLine1: row.addressLine1,
            addressLine2: row.addressLine2,
            city: row.city,
            state: row.state,
            zip: row.zip,
            county: row.county,
          },
        },
      ],
      phone: row.phone,
    },
    compliance: {},
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}
