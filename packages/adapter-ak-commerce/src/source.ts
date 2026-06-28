import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade-registry/core";
import {
  AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID,
  AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_URL,
  AK_COMMERCE_SOURCE_ENTRY,
} from "./constants.js";
import type { AlaskaCommerceRow } from "./map.js";
import { mapAlaskaCommerceTradeCategories, normalizeAlaskaCommerceStatus } from "./normalize.js";
import { streamAlaskaCommerceCsvFile } from "./parse.js";

export const alaskaCommerceConstructionContractorsAdapter: TradeLicenseSourceAdapter = {
  sourceId: AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID,
  async getSourceMetadata() {
    return AK_COMMERCE_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Local fixture adapter is available. Live Alaska CBPL search and protected download access are not implemented.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The Alaska CBPL fixture adapter requires a local filePath.");
    }

    yield* streamAlaskaCommerceCsvFile({
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
    return normalizeAlaskaCommerceRecord(raw);
  },
};

export function normalizeAlaskaCommerceRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as AlaskaCommerceRow;
  const status = normalizeAlaskaCommerceStatus(row);
  const classifications = [row.endorsement, row.classification].filter((value): value is string => Boolean(value));
  const record: CanonicalTradeLicenseRecord = {
    sourceId: AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "AK",
    },
    agency: AK_COMMERCE_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_URL,
      sourceType: "html_lookup",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: AK_COMMERCE_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "Alaska CBPL professional licensing spans many programs and is not limited to construction contractor records.",
        "Business licenses, corporations, local permits, and non-CBPL authorizations are outside this fixture adapter's scope.",
        "No matching record in this source is not proof that a license, endorsement, registration, or local authorization does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeCode: row.program,
      typeLabel: row.licenseType,
      classificationCodes: classifications,
      classificationLabels: classifications,
      tradeCategories: mapAlaskaCommerceTradeCategories(row),
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
