import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalTradeLicenseRecordSchema, type TradeLicenseSourceAdapter } from "@opentrade/core";
import { expect } from "vitest";

export type AdapterConformanceCase = {
  adapter: TradeLicenseSourceAdapter;
  registryPath: string;
  expectedFixtureRecordCount: number;
};

export async function expectAdapterConforms(input: AdapterConformanceCase): Promise<void> {
  const metadata = await input.adapter.getSourceMetadata();
  const registryEntry = JSON.parse(await readFile(join(process.cwd(), input.registryPath), "utf8"));

  expect(metadata.id).toBe(input.adapter.sourceId);
  expect(metadata).toEqual(registryEntry);
  expect(metadata.adapterStatus).toBe("implemented");
  expect(metadata.adapterQualityLevel).toBe(4);
  expect(metadata.verificationReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(metadata.verificationCaveats?.length).toBeGreaterThanOrEqual(2);
  expect(metadata.testFixturePath).toBeTruthy();

  const availability = await input.adapter.checkAvailability();
  expect(availability.ok).toBe(true);
  expect(availability.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  const rawRecords = [];
  for await (const rawRecord of input.adapter.streamRawRecords({
    filePath: join(process.cwd(), metadata.testFixturePath!),
    fetchedAt: "2026-06-21T00:00:00.000Z",
  })) {
    rawRecords.push(rawRecord);
  }

  expect(rawRecords).toHaveLength(input.expectedFixtureRecordCount);
  const rawFingerprints = new Set<string>();

  for (const rawRecord of rawRecords) {
    expect(rawRecord.sourceId).toBe(input.adapter.sourceId);
    expect(rawRecord.fetchedAt).toBe("2026-06-21T00:00:00.000Z");
    expect(rawRecord.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    rawFingerprints.add(rawRecord.fingerprint);

    const normalized = canonicalTradeLicenseRecordSchema.parse(await input.adapter.normalize(rawRecord));
    expect(normalized.sourceId).toBe(input.adapter.sourceId);
    expect(normalized.jurisdiction.country).toBe(metadata.jurisdiction.country);
    expect(normalized.jurisdiction.state).toBe(metadata.jurisdiction.state);
    expect(normalized.agency).toEqual(metadata.agency);
    expect(normalized.source.sourceUrl).toBe(metadata.sourceUrl);
    expect(normalized.source.sourceType).toBe(metadata.sourceType);
    expect(normalized.source.fetchedAt).toBe(rawRecord.fetchedAt);
    expect(normalized.source.sourceLastModifiedAt ?? null).toBe(rawRecord.sourceLastModifiedAt ?? null);
    expect(normalized.source.redistributionStatus).toBe(metadata.redistributionStatus);
    expect(normalized.source.caveats?.length).toBeGreaterThan(0);
    expect(normalized.raw.record).toBeDefined();
    expect(normalized.raw.fingerprint).toBe(rawRecord.fingerprint);
  }

  expect(rawFingerprints.size).toBe(rawRecords.length);
}
