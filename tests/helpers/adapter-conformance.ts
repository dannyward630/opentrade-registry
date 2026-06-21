import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalTradeLicenseRecordSchema, type TradeLicenseSourceAdapter } from "@opentrade/core";
import { expect } from "vitest";

export type AdapterConformanceCase = {
  adapter: TradeLicenseSourceAdapter;
  registryPath: string;
};

export async function expectAdapterConforms(input: AdapterConformanceCase): Promise<void> {
  const metadata = await input.adapter.getSourceMetadata();
  const registryEntry = JSON.parse(await readFile(join(process.cwd(), input.registryPath), "utf8"));

  expect(metadata.id).toBe(input.adapter.sourceId);
  expect(metadata).toEqual(registryEntry);
  expect(metadata.adapterStatus).toBe("implemented");
  expect(metadata.testFixturePath).toBeTruthy();

  const availability = await input.adapter.checkAvailability();
  expect(availability.ok).toBe(true);
  expect(availability.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  const rawRecords = [];
  for await (const rawRecord of input.adapter.streamRawRecords({
    filePath: join(process.cwd(), metadata.testFixturePath!),
    fetchedAt: "2026-06-21T00:00:00.000Z",
    limit: 1,
  })) {
    rawRecords.push(rawRecord);
  }

  expect(rawRecords).toHaveLength(1);
  expect(rawRecords[0].sourceId).toBe(input.adapter.sourceId);
  expect(rawRecords[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const normalized = await input.adapter.normalize(rawRecords[0]);
  expect(canonicalTradeLicenseRecordSchema.parse(normalized)).toBeDefined();
  expect(normalized.sourceId).toBe(input.adapter.sourceId);
  expect(normalized.source.sourceUrl).toBe(metadata.sourceUrl);
  expect(normalized.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
}
