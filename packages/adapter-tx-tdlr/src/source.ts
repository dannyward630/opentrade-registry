import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade/core";
import { TX_TDLR_ALL_LICENSES_SOURCE_ID, TX_TDLR_ALL_LICENSES_SOURCE_URL, TX_TDLR_SOURCE_ENTRY } from "./constants.js";
import type { TexasTdlrRow } from "./map.js";
import { streamTexasTdlrCsvFile } from "./parse.js";
import { mapTexasTdlrTradeCategory, normalizeTexasTdlrStatus } from "./normalize.js";

export const texasTdlrAllLicensesAdapter: TradeLicenseSourceAdapter = {
  sourceId: TX_TDLR_ALL_LICENSES_SOURCE_ID,
  async getSourceMetadata() {
    return TX_TDLR_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Local-file fixture adapter is available. Live Texas Open Data download is not implemented in v0.2.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The Texas TDLR v0.2 adapter requires a local filePath.");
    }

    yield* streamTexasTdlrCsvFile({
      filePath: options.filePath,
      fetchedAt: options.fetchedAt,
      sourceLastModifiedAt: options.sourceLastModifiedAt,
      limit: options.limit,
    });
  },
  async normalize(raw) {
    return normalizeTexasTdlrRecord(raw);
  },
};

export function normalizeTexasTdlrRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as TexasTdlrRow;
  const status = normalizeTexasTdlrStatus({ expirationDate: row.expirationDate });
  const tradeCategory = mapTexasTdlrTradeCategory(row.licenseType);
  const record: CanonicalTradeLicenseRecord = {
    sourceId: TX_TDLR_ALL_LICENSES_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "TX",
      county: row.businessCounty,
    },
    agency: TX_TDLR_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: TX_TDLR_ALL_LICENSES_SOURCE_URL,
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: TX_TDLR_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "The Texas TDLR All Licenses dataset spans many license types and is not limited to construction or skilled-trade licenses.",
        "No matching record in this source is not proof that a license does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeCode: row.licenseSubtype,
      typeLabel: row.licenseType,
      classificationCodes: row.licenseSubtype ? [row.licenseSubtype] : [],
      classificationLabels: [row.licenseType, row.licenseSubtype].filter((value): value is string => Boolean(value)),
      tradeCategories: [tradeCategory],
    },
    identity: {
      businessName: row.businessName,
      licenseeName: row.ownerName,
      personnel: row.ownerName ? [{ name: row.ownerName, role: "owner", raw: { sourceField: "OWNER NAME" } }] : [],
    },
    status: {
      rawStatusCode: row.continuingEducationFlag,
      rawStatusLabel: row.continuingEducationFlag ? `Continuing education flag: ${row.continuingEducationFlag}` : null,
      normalized: status.normalized,
      isCurrent: status.isCurrent,
    },
    dates: {
      expirationDate: row.expirationDate,
    },
    contact: {
      addresses: [
        {
          type: "business",
          line1: row.businessAddressLine1,
          line2: row.businessAddressLine2,
          line3: row.businessCityStateZip,
          county: row.businessCounty,
          country: "US",
          raw: {
            businessAddressLine1: row.businessAddressLine1,
            businessAddressLine2: row.businessAddressLine2,
            businessCityStateZip: row.businessCityStateZip,
            businessCounty: row.businessCounty,
          },
        },
        {
          type: "mailing",
          line1: row.mailingAddressLine1,
          line2: row.mailingAddressLine2,
          line3: row.mailingAddressCityStateZip,
          county: row.mailingAddressCounty,
          country: "US",
          raw: {
            mailingAddressLine1: row.mailingAddressLine1,
            mailingAddressLine2: row.mailingAddressLine2,
            mailingAddressCityStateZip: row.mailingAddressCityStateZip,
            mailingAddressCounty: row.mailingAddressCounty,
          },
        },
      ],
      phone: row.businessTelephone,
    },
    compliance: {},
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}
