import { describe, expect, it } from "vitest";
import {
  OPENTRADE_V1_API_VERSION,
  OPENTRADE_V1_CANONICAL_SCHEMA_VERSION,
  OPENTRADE_V1_SOURCE_REGISTRY_SCHEMA_VERSION,
  OPENTRADE_V2_API_VERSION,
  OPENTRADE_V2_CANONICAL_SCHEMA_VERSION,
  OPENTRADE_V2_SOURCE_REGISTRY_SCHEMA_VERSION,
  canonicalTradeLicenseRecordV2Schema,
  migrateCanonicalTradeLicenseRecordV1ToV2,
  parseCanonicalTradeLicenseRecordV1,
  parseCanonicalTradeLicenseRecordV2,
} from "@opentrade-registry/core";

describe("v2 canonical contracts", () => {
  it("publishes named v1 and v2 identifiers", () => {
    expect(OPENTRADE_V2_API_VERSION).toBe("2.0");
    expect(OPENTRADE_V2_CANONICAL_SCHEMA_VERSION).toBe("2.0");
    expect(OPENTRADE_V2_SOURCE_REGISTRY_SCHEMA_VERSION).toBe("2.0");
    expect(OPENTRADE_V1_API_VERSION).toBe("1.0");
    expect(OPENTRADE_V1_CANONICAL_SCHEMA_VERSION).toBe("1.0");
    expect(OPENTRADE_V1_SOURCE_REGISTRY_SCHEMA_VERSION).toBe("1.0");
  });

  it("reads a v1 canonical record through the compatibility reader", () => {
    const record = parseCanonicalTradeLicenseRecordV1(v1Record());
    expect(record.schemaVersion).toBe("1.0");
    expect(record.raw.fingerprint).toBe("fixture-fingerprint");
  });

  it("requires v2 provenance, version, publication, and sensitivity metadata", () => {
    expect(canonicalTradeLicenseRecordV2Schema.safeParse({
      ...v1Record(),
      schemaVersion: "2.0",
      id: "record-1",
      recordVersion: "version-1",
      sourceSnapshotId: "snapshot-1",
      observedAt: "2026-06-29T00:00:00.000Z",
      ...reviewMetadata(),
    }).success).toBe(true);
  });

  it("migrates v1 only when required review metadata is supplied", () => {
    const record = migrateCanonicalTradeLicenseRecordV1ToV2(v1Record(), {
      id: "record-1",
      recordVersion: "version-1",
      sourceSnapshotId: "snapshot-1",
      observedAt: "2026-06-29T00:00:00.000Z",
      ...reviewMetadata(),
    });
    expect(record.schemaVersion).toBe("2.0");
    expect(parseCanonicalTradeLicenseRecordV2(record)).toEqual(record);
  });
});

function v1Record() {
  return {
    schemaVersion: "1.0",
    sourceId: "us.fl.dbpr.construction",
    jurisdiction: { country: "US", state: "FL" },
    agency: { name: "Florida DBPR" },
    source: {
      sourceUrl: "https://example.gov/licenses.csv",
      sourceType: "bulk_csv",
      fetchedAt: "2026-06-29T00:00:00.000Z",
    },
    license: { licenseNumber: "CGC1234567", licenseNumberNormalized: "CGC1234567" },
    identity: {},
    status: { normalized: "active" },
    dates: {},
    contact: {},
    raw: { record: { License: "CGC1234567" }, fingerprint: "fixture-fingerprint" },
  } as const;
}

function reviewMetadata() {
  return {
    publication: {
      disposition: "review_required",
      rawRecordDisposition: "withheld",
      reviewedAt: "2026-06-29T00:00:00.000Z",
    },
    sensitivity: {
      level: "unknown",
      containsHomeAddress: "unknown",
      containsPersonalEmail: "unknown",
      containsPersonalPhone: "unknown",
    },
  } as const;
}
