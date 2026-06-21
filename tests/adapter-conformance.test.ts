import { join } from "node:path";
import { canonicalTradeLicenseRecordSchema, type TradeLicenseSourceAdapter } from "@opentrade/core";
import { floridaDbprConstructionAdapter } from "@opentrade/adapter-fl-dbpr";
import { texasTdlrAllLicensesAdapter } from "@opentrade/adapter-tx-tdlr";
import { washingtonLniContractorsAdapter } from "@opentrade/adapter-wa-lni";
import { describe, expect, it } from "vitest";

const adapterCases: TradeLicenseSourceAdapter[] = [
  floridaDbprConstructionAdapter,
  texasTdlrAllLicensesAdapter,
  washingtonLniContractorsAdapter,
];

describe("implemented adapter conformance", () => {
  for (const adapter of adapterCases) {
    it(`${adapter.sourceId} exposes metadata and normalizes fixture records`, async () => {
      const metadata = await adapter.getSourceMetadata();
      expect(metadata.id).toBe(adapter.sourceId);
      expect(metadata.adapterStatus).toBe("implemented");
      expect(metadata.testFixturePath).toBeTruthy();

      const availability = await adapter.checkAvailability();
      expect(availability.ok).toBe(true);
      expect(availability.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      const rawRecords = [];
      for await (const rawRecord of adapter.streamRawRecords({
        filePath: join(process.cwd(), metadata.testFixturePath!),
        fetchedAt: "2026-06-21T00:00:00.000Z",
        limit: 1,
      })) {
        rawRecords.push(rawRecord);
      }

      expect(rawRecords).toHaveLength(1);
      expect(rawRecords[0].sourceId).toBe(adapter.sourceId);
      expect(rawRecords[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);

      const normalized = await adapter.normalize(rawRecords[0]);
      expect(canonicalTradeLicenseRecordSchema.parse(normalized)).toBeDefined();
      expect(normalized.sourceId).toBe(adapter.sourceId);
      expect(normalized.source.sourceUrl).toBe(metadata.sourceUrl);
      expect(normalized.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    });
  }
});
