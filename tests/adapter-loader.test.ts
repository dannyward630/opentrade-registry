import { describe, expect, it } from "vitest";
import { loadConfiguredAdapters, parseAdapterSpecs } from "../services/ingestion-worker/src/adapter-loader.js";

describe("ingestion worker adapter loader", () => {
  it("parses explicitly scoped package exports", () => {
    expect(parseAdapterSpecs("@opentrade-registry/adapter-fl-dbpr:floridaDbprConstructionAdapter")).toEqual([
      { packageName: "@opentrade-registry/adapter-fl-dbpr", exportName: "floridaDbprConstructionAdapter" },
    ]);
    expect(parseAdapterSpecs(undefined)).toEqual([]);
  });

  it("rejects unscoped or malformed module specifications", () => {
    expect(() => parseAdapterSpecs("pg:Pool")).toThrow("outside the OpenTrade Registry package scope");
    expect(() => parseAdapterSpecs("@opentrade-registry/adapter-fl-dbpr")).toThrow("Invalid adapter specification");
    expect(() => parseAdapterSpecs("@opentrade-registry/adapter-fl-dbpr:bad-export-name!")).toThrow("export");
  });

  it("loads and deduplicates adapter exports through an injectable module loader", async () => {
    const adapter = {
      sourceId: "us.test.example",
      getSourceMetadata: async () => ({}),
      checkAvailability: async () => ({ ok: true, checkedAt: new Date().toISOString() }),
      streamRawRecords: async function* () {},
      normalize: async () => ({}),
    };
    const loaded = await loadConfiguredAdapters(
      parseAdapterSpecs("@opentrade-registry/adapter-test:testAdapter"),
      async () => ({ testAdapter: adapter }),
    );
    expect([...loaded.keys()]).toEqual(["us.test.example"]);
    await expect(loadConfiguredAdapters(
      parseAdapterSpecs("@opentrade-registry/adapter-test:missing"),
      async () => ({}),
    )).rejects.toThrow("not a trade-license source adapter");
  });
});
