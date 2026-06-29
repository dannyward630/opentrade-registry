import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade-registry/core";
import { CA_CSLB_CONTRACTORS_SOURCE_ID, CA_CSLB_CONTRACTORS_SOURCE_URL, CA_CSLB_SOURCE_ENTRY } from "./constants.js";
import type { CaliforniaCslbRow } from "./map.js";
import { mapCaliforniaCslbTradeCategories, normalizeCaliforniaCslbStatus } from "./normalize.js";
import { streamCaliforniaCslbFile } from "./parse.js";

export const californiaCslbContractorsAdapter: TradeLicenseSourceAdapter = {
  sourceId: CA_CSLB_CONTRACTORS_SOURCE_ID,
  async getSourceMetadata() {
    return CA_CSLB_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Official-shape CSV/XLSX import is available; callers retain control of source acquisition and provenance.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The California CSLB adapter requires a local filePath.");
    }

    yield* streamCaliforniaCslbFile({
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
    return normalizeCaliforniaCslbRecord(raw);
  },
};

export function normalizeCaliforniaCslbRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as CaliforniaCslbRow;
  const status = normalizeCaliforniaCslbStatus(row);
  const record: CanonicalTradeLicenseRecord = {
    sourceId: CA_CSLB_CONTRACTORS_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "CA",
      county: row.county,
    },
    agency: CA_CSLB_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? CA_CSLB_CONTRACTORS_SOURCE_URL,
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: CA_CSLB_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "California CSLB mapping is validated against the official master-license CSV columns; fixture rows remain hand-authored.",
        "CSLB companion files and instant license lookup may contain source details that are not represented by this fixture.",
        "No matching record in this source is not proof that a license does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeLabel: row.licenseType,
      classificationCodes: row.classifications,
      classificationLabels: row.classifications,
      tradeCategories: mapCaliforniaCslbTradeCategories(row),
    },
    identity: {
      businessName: row.businessName,
      dbaName: row.dbaName,
      licenseeName: row.businessName,
      personnel: row.personnelName ? [{ name: row.personnelName, role: normalizePersonnelRole(row.personnelTitle), raw: { sourceField: "Personnel Name", sourceTitle: row.personnelTitle } }] : [],
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
          type: "public_record",
          line1: row.address,
          city: row.city,
          state: row.state,
          postalCode: row.zipCode,
          county: row.county,
          country: "US",
          raw: {
            address: row.address,
            city: row.city,
            state: row.state,
            zipCode: row.zipCode,
            county: row.county,
          },
        },
      ],
      phone: row.phone,
    },
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}

function normalizePersonnelRole(value: string | null | undefined) {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("qualifier")) {
    return "qualifier";
  }

  if (normalized === "rmo" || normalized.includes("responsible managing")) {
    return "responsible_managing_officer";
  }

  if (normalized.includes("owner")) {
    return "owner";
  }

  if (normalized.includes("officer")) {
    return "officer";
  }

  if (normalized.includes("partner")) {
    return "partner";
  }

  return "unknown";
}
