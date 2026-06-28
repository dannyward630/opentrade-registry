import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CanonicalTradeLicenseRecord } from "@opentrade-registry/core";
import { OpenTradeSqliteCache, SQLITE_SCHEMA_VERSION, redactCanonicalRecord } from "@opentrade-registry/storage-sqlite";

describe("OpenTrade SQLite cache", () => {
  it("imports, persists, reopens, and verifies canonical records", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-sqlite-v1-"));
    const filePath = join(directory, "cache.sqlite");
    try {
      const cache = await OpenTradeSqliteCache.open({ filePath });
      expect(cache.schemaVersion).toBe(SQLITE_SCHEMA_VERSION);
      expect(cache.importRecords([record("ONE", "fingerprint-one")])).toBe(1);
      const matched = cache.verify("test.source", "US-TS", "one");
      expect(matched.result).toBe("matched");
      expect(matched.matchedRecord?.schemaVersion).toBe("1.0");
      await cache.close();
      expect((await readFile(filePath)).subarray(0, 6).toString()).toBe("SQLite");

      const reopened = await OpenTradeSqliteCache.open({ filePath, create: false });
      expect(reopened.findByLicenseNumber("test.source", "ONE")).toHaveLength(1);
      await reopened.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("returns neutral not-found, ambiguous, and invalid verification results", async () => {
    const cache = await OpenTradeSqliteCache.open();
    cache.importRecords([record("DUP", "fingerprint-a"), record("DUP", "fingerprint-b")]);
    expect(cache.verify("test.source", "US-TS", "MISSING").result).toBe("not_found");
    expect(cache.verify("test.source", "US-TS", "DUP").result).toBe("ambiguous");
    expect(cache.verify("test.source", "US-TS", "!!!").result).toBe("missing_required_input");
    await cache.close();
  });

  it("rolls back the whole import when any record is invalid", async () => {
    const cache = await OpenTradeSqliteCache.open();
    const invalid = { ...record("BAD", "fingerprint-bad"), license: { licenseNumber: "", licenseNumberNormalized: "" } };
    expect(() => cache.importRecords([record("GOOD", "fingerprint-good"), invalid as CanonicalTradeLicenseRecord])).toThrow();
    expect(cache.findByLicenseNumber("test.source", "GOOD")).toEqual([]);
    await cache.close();
  });

  it("applies retention and redaction without changing provenance", async () => {
    const cache = await OpenTradeSqliteCache.open();
    cache.importRecords([record("OLD", "fingerprint-old")], { retainedUntil: "2020-01-01T00:00:00.000Z" });
    expect(cache.pruneExpiredRetention("2021-01-01T00:00:00.000Z")).toBe(1);

    cache.importRecords([record("PRIVATE", "fingerprint-private")], { retainedUntil: "2030-01-01T00:00:00.000Z" });
    expect(cache.redact("test.source", "PRIVATE", { removePersonnel: true })).toBe(1);
    const redacted = cache.findByLicenseNumber("test.source", "PRIVATE")[0];
    expect(redacted.contact.phone).toBeNull();
    expect(redacted.contact.addresses?.[0]?.line1).toBeNull();
    expect(redacted.identity.personnel).toEqual([]);
    expect(redacted.raw.record).toEqual({ redacted: true });
    expect(redacted.raw.fingerprint).toBe("fingerprint-private");
    expect(cache.pruneExpiredRetention("2031-01-01T00:00:00.000Z")).toBe(1);
    await cache.close();
  });

  it("provides a pure redaction helper", () => {
    const redacted = redactCanonicalRecord(record("PURE", "fingerprint-pure"));
    expect(redacted.contact.email).toBeNull();
    expect(redacted.contact.website).toBe("https://example.test");
  });

  it("persists resumable import manifests with snapshot provenance", async () => {
    const cache = await OpenTradeSqliteCache.open();
    cache.startImportRun({
      id: "run-1",
      sourceId: "test.source",
      sourceUrl: "https://example.test/source",
      sourceSha256: "a".repeat(64),
      startedAt: "2026-06-27T00:00:00.000Z",
    });
    cache.checkpointImportRun("run-1", {
      lastProcessedRow: 250,
      rawRecordCount: 249,
      normalizedRecordCount: 248,
      warningCount: 1,
      errorCount: 1,
      duplicateRecordCount: 2,
    });
    cache.finishImportRun("run-1", {
      status: "interrupted",
      finishedAt: "2026-06-27T00:05:00.000Z",
    });

    expect(cache.getImportRun("run-1")).toEqual({
      id: "run-1",
      sourceId: "test.source",
      sourceUrl: "https://example.test/source",
      sourceSha256: "a".repeat(64),
      status: "interrupted",
      startedAt: "2026-06-27T00:00:00.000Z",
      finishedAt: "2026-06-27T00:05:00.000Z",
      lastProcessedRow: 250,
      rawRecordCount: 249,
      normalizedRecordCount: 248,
      warningCount: 1,
      errorCount: 1,
      duplicateRecordCount: 2,
    });
    await cache.close();
  });
});

function record(licenseNumber: string, fingerprint: string): CanonicalTradeLicenseRecord {
  return {
    sourceId: "test.source",
    jurisdiction: { country: "US", state: "TS" },
    agency: { name: "Test Agency" },
    source: { sourceUrl: "https://example.test/source", sourceType: "bulk_csv", fetchedAt: "2026-06-27T00:00:00.000Z", redistributionStatus: "unknown", caveats: ["Test fixture only."] },
    license: { licenseNumber, licenseNumberNormalized: licenseNumber, tradeCategories: ["unknown"] },
    identity: { businessName: "Test Business", personnel: [{ name: "Test Person", role: "qualifier" }] },
    status: { normalized: "active", isCurrent: true },
    dates: {},
    contact: { phone: "5550100", email: "person@example.test", website: "https://example.test", addresses: [{ type: "business", line1: "1 Test St", city: "Test", state: "TS", country: "US" }] },
    raw: { record: { licenseNumber }, fingerprint },
  };
}
