import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade/core";
import {
  IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID,
  IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_URL,
  IL_IDFPR_SOURCE_ENTRY,
} from "./constants.js";
import type { IllinoisIdfprRow } from "./map.js";
import { mapIllinoisIdfprTradeCategories, normalizeIllinoisIdfprStatus } from "./normalize.js";
import { streamIllinoisIdfprCsvFile } from "./parse.js";

export const illinoisIdfprRoofingContractorsAdapter: TradeLicenseSourceAdapter = {
  sourceId: IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID,
  async getSourceMetadata() {
    return IL_IDFPR_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Local fixture adapter is available. Live Illinois IDFPR lookup and bulk lookup access are not implemented.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The Illinois IDFPR fixture adapter requires a local filePath.");
    }

    yield* streamIllinoisIdfprCsvFile({
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
    return normalizeIllinoisIdfprRecord(raw);
  },
};

export function normalizeIllinoisIdfprRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as IllinoisIdfprRow;
  const status = normalizeIllinoisIdfprStatus(row);
  const classifications = [row.professionName, row.licenseType, row.board].filter((value): value is string => Boolean(value));
  const record: CanonicalTradeLicenseRecord = {
    sourceId: IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "IL",
      county: row.county,
    },
    agency: IL_IDFPR_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_URL,
      sourceType: "html_lookup",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: IL_IDFPR_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "Illinois IDFPR fixture support is based on a tiny hand-authored sample, not a live IDFPR export or lookup response.",
        "This adapter is scoped to IDFPR roofing contractor records and does not represent every Illinois construction, trade, local permit, or business registration source.",
        "No matching record in this source is not proof that a license, local authorization, or other credential does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeLabel: row.licenseType,
      classificationLabels: classifications,
      tradeCategories: mapIllinoisIdfprTradeCategories(row),
    },
    identity: {
      businessName: row.businessName,
      dbaName: row.dbaName,
      licenseeName: row.licenseeName,
    },
    status: {
      rawStatusLabel: row.status,
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
    compliance: {
      discipline: row.discipline ? { summary: row.discipline } : undefined,
    },
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}
