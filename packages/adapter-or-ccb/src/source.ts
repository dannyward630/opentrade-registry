import type { CanonicalTradeLicenseRecord, RawSourceRecord, SourceAvailability, TradeLicenseSourceAdapter } from "@opentrade-registry/core";
import { canonicalTradeLicenseRecordSchema, normalizeLicenseNumber } from "@opentrade-registry/core";
import { OR_CCB_ACTIVE_LICENSES_SOURCE_ID, OR_CCB_ACTIVE_LICENSES_SOURCE_URL, OR_CCB_SOURCE_ENTRY } from "./constants.js";
import type { OregonCcbRow } from "./map.js";
import { streamOregonCcbCsvFile } from "./parse.js";
import { mapOregonCcbTradeCategories, normalizeOregonCcbStatus } from "./normalize.js";

export const oregonCcbActiveLicensesAdapter: TradeLicenseSourceAdapter = {
  sourceId: OR_CCB_ACTIVE_LICENSES_SOURCE_ID,
  async getSourceMetadata() {
    return OR_CCB_SOURCE_ENTRY;
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
      throw new Error("The Oregon CCB adapter requires a local filePath.");
    }

    yield* streamOregonCcbCsvFile({
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
    return normalizeOregonCcbRecord(raw);
  },
};

export function normalizeOregonCcbRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  const row = raw.record as OregonCcbRow;
  const status = normalizeOregonCcbStatus(row);
  const record: CanonicalTradeLicenseRecord = {
    sourceId: OR_CCB_ACTIVE_LICENSES_SOURCE_ID,
    jurisdiction: {
      country: "US",
      state: "OR",
      county: row.countyName,
    },
    agency: OR_CCB_SOURCE_ENTRY.agency,
    source: {
      sourceUrl: raw.sourceUrl ?? OR_CCB_ACTIVE_LICENSES_SOURCE_URL,
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      sourceLastModifiedAt: raw.sourceLastModifiedAt ?? undefined,
      redistributionStatus: OR_CCB_SOURCE_ENTRY.redistributionStatus,
      caveats: [
        "The Oregon CCB Active Licenses source may exclude inactive, expired, suspended, historical, local, or other agency records.",
        "No matching record in this source is not proof that a license does not exist elsewhere.",
        ...(raw.warnings?.map((warning) => warning.message) ?? []),
      ],
    },
    license: {
      licenseNumber: row.licenseNumber,
      licenseNumberNormalized: normalizeLicenseNumber(row.licenseNumber) ?? row.licenseNumberNormalized,
      typeLabel: row.licenseType,
      classificationCodes: row.endorsementText ? [row.endorsementText] : [],
      classificationLabels: [row.licenseType, row.endorsementText].filter((value): value is string => Boolean(value)),
      tradeCategories: mapOregonCcbTradeCategories(row),
    },
    identity: {
      businessName: row.fullName,
      licenseeName: row.rmiName,
      personnel: row.rmiName ? [{ name: row.rmiName, role: "responsible_managing_officer", raw: { sourceField: "rmi_name" } }] : [],
    },
    status: {
      rawStatusLabel: "Active-license source",
      normalized: status.normalized,
      isCurrent: status.isCurrent,
    },
    dates: {
      originalLicensureDate: row.originalRegistrationDate,
      expirationDate: row.expirationDate,
    },
    contact: {
      addresses: [
        {
          type: "business",
          line1: row.address,
          city: row.city,
          state: row.state,
          postalCode: row.zipCode,
          county: row.countyName,
          country: "US",
          raw: {
            address: row.address,
            city: row.city,
            state: row.state,
            zipCode: row.zipCode,
            countyName: row.countyName,
          },
        },
      ],
      phone: row.phoneNumber,
    },
    compliance: {
      bond: row.bondCompany || row.bondAmount || row.bondExpirationDate
        ? { company: row.bondCompany, amount: row.bondAmount, expirationDate: row.bondExpirationDate }
        : undefined,
      insurance: row.insuranceCompany || row.insuranceAmount || row.insuranceExpirationDate
        ? { company: row.insuranceCompany, amount: row.insuranceAmount, expirationDate: row.insuranceExpirationDate }
        : undefined,
    },
    raw: {
      record: row.raw,
      fingerprint: raw.fingerprint || row.fingerprint,
    },
  };

  return canonicalTradeLicenseRecordSchema.parse(record);
}
