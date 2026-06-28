import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type CanonicalTradeLicenseRecord,
  type RawSourceRecord,
  type SourceRegistryEntry,
  type TradeLicenseSourceAdapter,
} from "@opentrade-registry/core";
import { runAdapterSync } from "../packages/cli/src/import/sync-runner.js";
import { OpenTradeSqliteCache } from "@opentrade-registry/storage-sqlite";

describe("sync runner canonical validation", () => {
  it("skips invalid canonical records and exports valid records", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "opentrade-sync-runner-"));
    try {
      await writeFile(join(rootDir, "unused.csv"), "fixture\n", "utf8");
      const outPath = join(rootDir, "records.jsonl");
      const result = await runAdapterSync({
        adapter: fixtureAdapter(),
        rootDir,
        filePath: "unused.csv",
        outPath,
        format: "jsonl",
      });

      expect(result.stats.rawRecordCount).toBe(2);
      expect(result.stats.normalizedRecordCount).toBe(1);
      expect(result.stats.errorCount).toBe(1);
      expect(result.errors).toEqual([
        expect.objectContaining({
          rowNumber: 2,
          recordFingerprint: "invalid-fingerprint",
        }),
      ]);

      const lines = (await readFile(outPath, "utf8")).trim().split("\n");
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]).license.licenseNumber).toBe("TEST123");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("fails strict sync when normalized records violate the canonical schema", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "opentrade-sync-runner-strict-"));
    try {
      await writeFile(join(rootDir, "unused.csv"), "fixture\n", "utf8");
      await expect(
        runAdapterSync({
          adapter: fixtureAdapter(),
          rootDir,
          filePath: "unused.csv",
          outPath: join(rootDir, "records.jsonl"),
          format: "jsonl",
          strict: true,
        }),
      ).rejects.toMatchObject({
        exitCode: 1,
        message: expect.stringContaining("Failed to normalize record 2"),
      });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("streams cache-only syncs without requiring an output record collection", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "opentrade-sync-runner-cache-"));
    const cachePath = join(rootDir, "records.sqlite");
    try {
      await writeFile(join(rootDir, "unused.csv"), "fixture\n", "utf8");
      const result = await runAdapterSync({
        adapter: fixtureAdapter(),
        rootDir,
        filePath: "unused.csv",
        cachePath,
        format: "jsonl",
      });
      expect(result.outputPath).toBeUndefined();
      expect(result.stats.normalizedRecordCount).toBe(1);

      const cache = await OpenTradeSqliteCache.open({ filePath: cachePath, create: false });
      expect(cache.findByLicenseNumber("us.test.fixture", "TEST123")).toHaveLength(1);
      await cache.close();
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

function fixtureAdapter(): TradeLicenseSourceAdapter {
  return {
    sourceId: "us.test.fixture",
    async getSourceMetadata() {
      return {
        id: "us.test.fixture",
        name: "Test Fixture",
        jurisdiction: { country: "US", state: "TX" },
        agency: { name: "Test Agency" },
        sourceType: "bulk_csv",
        sourceUrl: "https://example.test/source.csv",
        updateFrequency: "test",
        tradeCoverage: ["test"],
        licenseTypesIncluded: ["test"],
        knownExclusions: [],
        hasBulkDownload: false,
        hasLiveLookup: false,
        requiresJavaScript: false,
        requiresCaptcha: false,
        requiresAccount: false,
        redistributionStatus: "unknown",
        adapterStatus: "implemented",
        sourceDiscoveryStatus: "researched",
        adapterMaturity: "fixture_adapter",
        adapterQualityLevel: 4,
        coverageScope: "state_agency_partial",
        verificationReviewedAt: "2026-06-24T00:00:00.000Z",
        verificationCaveats: ["Test caveat.", "No match is only no match in this fixture."],
        verificationNotes: "Test adapter.",
      } satisfies SourceRegistryEntry;
    },
    async checkAvailability() {
      return { ok: true, checkedAt: "2026-06-24T00:00:00.000Z" };
    },
    async *streamRawRecords() {
      yield rawRecord(1, "valid-fingerprint");
      yield rawRecord(2, "invalid-fingerprint");
    },
    async normalize(raw) {
      if (raw.rowNumber === 2) {
        return {
          ...validCanonicalRecord(raw),
          license: {
            ...validCanonicalRecord(raw).license,
            licenseNumber: "",
            licenseNumberNormalized: "",
          },
        } as CanonicalTradeLicenseRecord;
      }

      return validCanonicalRecord(raw);
    },
  };
}

function rawRecord(rowNumber: number, fingerprint: string): RawSourceRecord {
  return {
    sourceId: "us.test.fixture",
    record: { rowNumber },
    rowNumber,
    fetchedAt: "2026-06-24T00:00:00.000Z",
    fingerprint,
  };
}

function validCanonicalRecord(raw: RawSourceRecord): CanonicalTradeLicenseRecord {
  return {
    sourceId: "us.test.fixture",
    jurisdiction: { country: "US", state: "TX" },
    agency: { name: "Test Agency" },
    source: {
      sourceUrl: "https://example.test/source.csv",
      sourceType: "bulk_csv",
      fetchedAt: raw.fetchedAt,
      redistributionStatus: "unknown",
      caveats: ["Test fixture only."],
    },
    license: {
      licenseNumber: "TEST123",
      licenseNumberNormalized: "TEST123",
      tradeCategories: ["unknown"],
    },
    identity: {
      licenseeName: "Test Licensee",
    },
    status: {
      normalized: "active",
    },
    dates: {},
    contact: {},
    raw: {
      record: raw.record,
      fingerprint: raw.fingerprint,
    },
  };
}
