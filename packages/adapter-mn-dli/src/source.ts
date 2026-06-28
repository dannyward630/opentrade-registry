import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade-registry/core";
import { MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID, MN_DLI_LICENSES_REGISTRATIONS_SOURCE_URL, MN_DLI_SOURCE_ENTRY } from "./constants.js";
import type { MinnesotaDliRow } from "./map.js";
import { mapMinnesotaDliTradeCategory, normalizeMinnesotaDliStatus } from "./normalize.js";
import { streamMinnesotaDliFile } from "./parse.js";

export const minnesotaDliLicensesRegistrationsAdapter: TradeLicenseSourceAdapter = {
  sourceId: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
  async getSourceMetadata() {
    return MN_DLI_SOURCE_ENTRY;
  },
  async checkAvailability(): Promise<SourceAvailability> {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Local official-shape CSV/XLSX import is available. Live Minnesota DLI archive download is not implemented.",
    };
  },
  async *streamRawRecords(options) {
    if (!options.filePath) {
      throw new Error("The Minnesota DLI local-file adapter requires a filePath.");
    }

    yield* streamMinnesotaDliFile({
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
    return normalizeMinnesotaDliRecord(raw);
  },
};

export function normalizeMinnesotaDliRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as MinnesotaDliRow;
  const status = normalizeMinnesotaDliStatus(row);
  const tradeCategory = mapMinnesotaDliTradeCategory(row.licenseType);
  const record: CanonicalTradeLicenseRecord = {
    sourceId: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "MN",
      county: row.county,
    },
    agency: MN_DLI_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? MN_DLI_LICENSES_REGISTRATIONS_SOURCE_URL,
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: MN_DLI_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "Minnesota DLI mapping is validated against the official nightly export columns; fixture rows remain hand-authored.",
        "The DLI source can include many license, bond, certification, and registration types beyond contractor licenses.",
        "No matching record in this source is not proof that a license does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeCode: row.licenseType,
      typeLabel: row.licenseType,
      classificationCodes: row.licenseType ? [row.licenseType] : [],
      classificationLabels: row.licenseType ? [row.licenseType] : [],
      tradeCategories: [tradeCategory],
    },
    identity: {
      businessName: row.name,
      dbaName: row.dbaName,
      licenseeName: row.name,
      personnel: row.name ? [{ name: row.name, role: "unknown", raw: { sourceField: "Name" } }] : [],
    },
    status: {
      rawStatusLabel: row.status,
      secondaryRawStatusCode: row.disciplineIndicator,
      secondaryRawStatusLabel: row.disciplineIndicator ? `Discipline indicator: ${row.disciplineIndicator}` : null,
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
          line1: row.addressLine1,
          line2: row.addressLine2,
          city: row.city,
          state: row.state,
          postalCode: row.zipCode,
          county: row.county,
          country: "US",
          raw: {
            addressLine1: row.addressLine1,
            addressLine2: row.addressLine2,
            city: row.city,
            state: row.state,
            zipCode: row.zipCode,
            county: row.county,
          },
        },
      ],
      phone: row.phone,
    },
    compliance: {
      discipline: row.disciplineIndicator,
    },
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}
