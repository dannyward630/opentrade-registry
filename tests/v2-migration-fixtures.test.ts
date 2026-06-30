import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  migrateCanonicalTradeLicenseRecordV1ToV2,
  migrateSourceRegistryEntryV1ToV2,
  parseCanonicalTradeLicenseRecordV2,
  parseSourceRegistryEntryV2,
} from "@opentrade-registry/core";

describe("v1 to v2 golden migration fixtures", () => {
  it("migrates a canonical record deterministically", async () => {
    const [input, metadata, expected] = await Promise.all([
      fixture("canonical-record-v1.json"),
      fixture("canonical-record-v2-metadata.json"),
      fixture("canonical-record-v2.json"),
    ]);
    const migrated = migrateCanonicalTradeLicenseRecordV1ToV2(input, metadata as never);
    expect(migrated).toEqual(expected);
    expect(parseCanonicalTradeLicenseRecordV2(migrated)).toEqual(expected);
  });

  it("migrates a source entry deterministically", async () => {
    const [input, metadata, expected] = await Promise.all([
      fixture("source-entry-v1.json"),
      fixture("source-entry-v2-metadata.json"),
      fixture("source-entry-v2.json"),
    ]);
    const migrated = migrateSourceRegistryEntryV1ToV2(input, metadata as never);
    expect(migrated).toEqual(expected);
    expect(parseSourceRegistryEntryV2(migrated)).toEqual(expected);
  });
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`fixtures/contracts/${name}`, import.meta.url), "utf8"));
}
