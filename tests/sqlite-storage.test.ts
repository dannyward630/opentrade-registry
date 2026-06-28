import { describe, expect, it } from "vitest";
import type { CanonicalTradeLicenseRecord } from "@opentrade-registry/core";
import {
  buildInsertLicenseRecordSql,
  buildInsertLicenseRecordValues,
  SQLITE_LICENSE_RECORD_COLUMNS,
  SQLITE_LICENSE_RECORD_TABLE,
  SQLITE_SCHEMA_SQL,
  toSqliteLicenseRecordRow,
} from "@opentrade-registry/storage-sqlite";

describe("@opentrade-registry/storage-sqlite", () => {
  it("exposes a schema for import runs and canonical license records", () => {
    expect(SQLITE_SCHEMA_SQL).toContain("create table if not exists opentrade_import_runs");
    expect(SQLITE_SCHEMA_SQL).toContain("create table if not exists opentrade_license_records");
    expect(SQLITE_SCHEMA_SQL).toContain("unique(source_id, fingerprint)");
    expect(SQLITE_SCHEMA_SQL).toContain("idx_opentrade_license_records_license_number_normalized");
  });

  it("maps canonical records to stable SQLite row fields", () => {
    const row = toSqliteLicenseRecordRow(sampleRecord, { importRunId: "import-1" });

    expect(row.id).toBe("us.test.agency:abc123");
    expect(row.source_id).toBe("us.test.agency");
    expect(row.import_run_id).toBe("import-1");
    expect(row.license_number).toBe("ABC-123");
    expect(row.license_number_normalized).toBe("ABC123");
    expect(row.normalized_status).toBe("active");
    expect(row.source_url).toBe("https://example.test/licenses.csv");
    expect(row.source_record_url).toBe("https://example.test/licenses/ABC-123");
    expect(row.fingerprint).toBe("abc123");
    expect(JSON.parse(row.source_json ?? "{}")).toMatchObject({
      sourceUrl: "https://example.test/licenses.csv",
      sourceRecordUrl: "https://example.test/licenses/ABC-123",
      caveats: ["Fixture record for storage tests."],
    });
    expect(JSON.parse(row.raw_record_json ?? "{}")).toEqual({ license: "ABC-123", status: "CURRENT" });
  });

  it("builds insert SQL and values in column order", () => {
    const row = toSqliteLicenseRecordRow(sampleRecord);
    const sql = buildInsertLicenseRecordSql();
    const values = buildInsertLicenseRecordValues(row);

    expect(sql).toContain(`insert into ${SQLITE_LICENSE_RECORD_TABLE}`);
    expect(sql.match(/\?/g)).toHaveLength(SQLITE_LICENSE_RECORD_COLUMNS.length);
    expect(values).toHaveLength(SQLITE_LICENSE_RECORD_COLUMNS.length);
    expect(values[SQLITE_LICENSE_RECORD_COLUMNS.indexOf("source_id")]).toBe("us.test.agency");
    expect(values[SQLITE_LICENSE_RECORD_COLUMNS.indexOf("license_number_normalized")]).toBe("ABC123");
  });

  it("rejects unsafe custom table names", () => {
    expect(() => buildInsertLicenseRecordSql("license_records; drop table license_records")).toThrow(
      /Invalid SQLite identifier/,
    );
  });
});

const sampleRecord: CanonicalTradeLicenseRecord = {
  sourceId: "us.test.agency",
  jurisdiction: {
    country: "US",
    state: "TS",
  },
  agency: {
    name: "Test Licensing Agency",
    url: "https://example.test",
  },
  source: {
    sourceUrl: "https://example.test/licenses.csv",
    sourceRecordUrl: "https://example.test/licenses/ABC-123",
    sourceType: "bulk_csv",
    fetchedAt: "2026-06-26T00:00:00.000Z",
    importRunId: "record-import",
    redistributionStatus: "unknown",
    caveats: ["Fixture record for storage tests."],
  },
  license: {
    licenseNumber: "ABC-123",
    licenseNumberNormalized: "ABC123",
    typeCode: "ABC",
    typeLabel: "Example Contractor",
    tradeCategories: ["general_contracting"],
  },
  identity: {
    businessName: "Example Construction LLC",
    dbaName: null,
    licenseeName: null,
  },
  status: {
    rawStatusLabel: "CURRENT",
    normalized: "active",
    isCurrent: true,
  },
  dates: {
    expirationDate: "2099-12-31T00:00:00.000Z",
  },
  contact: {
    addresses: [
      {
        type: "public_record",
        line1: "123 Example St",
        city: "Example",
        state: "TS",
        postalCode: "12345",
      },
    ],
  },
  raw: {
    record: {
      license: "ABC-123",
      status: "CURRENT",
    },
    fingerprint: "abc123",
  },
};
