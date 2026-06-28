import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CanonicalTradeLicenseRecord } from "@opentrade/core";
import { toCsv, writeCanonicalRecords } from "../packages/cli/src/import/export.js";

describe("canonical export hardening", () => {
  it.each(["=1+1", "+SUM(A1:A2)", "-2+3", "@cmd", "\tformula", "\rformula"])("neutralizes spreadsheet formula prefix %j", (value) => {
    const csv = toCsv([record(value)]);
    expect(csv).toContain(`'${value}`);
    expect(csv).not.toContain(`,${value},`);
  });

  it("atomically replaces output and removes temporary files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-export-"));
    const outputPath = join(directory, "records.jsonl");
    try {
      await writeCanonicalRecords({ outputPath, format: "jsonl", records: [record("SAFE")] });
      const exported = JSON.parse((await readFile(outputPath, "utf8")).trim());
      expect(exported.schemaVersion).toBe("1.0");
      expect(exported.license.licenseNumber).toBe("SAFE");
      expect((await readdir(directory)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function record(licenseNumber: string): CanonicalTradeLicenseRecord {
  return {
    sourceId: "test.source",
    jurisdiction: { country: "US", state: "TS" },
    agency: { name: "Test" },
    source: { sourceUrl: "https://example.test", sourceType: "bulk_csv", fetchedAt: "2026-01-01T00:00:00.000Z" },
    license: { licenseNumber, licenseNumberNormalized: licenseNumber, tradeCategories: ["unknown"] },
    identity: {},
    status: { normalized: "unknown" },
    dates: {},
    contact: {},
    raw: { record: { licenseNumber }, fingerprint: `fingerprint-${licenseNumber}` },
  };
}
