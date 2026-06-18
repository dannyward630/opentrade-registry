import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildFingerprint, normalizeLicenseDigits, normalizeLicenseNumber } from "@opentrade/core";
import { floridaDbprConstructionAdapter } from "../src/source.js";

const fixturePath = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-sample.csv");
const edgeFixturePath = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-edge-cases.csv");

describe("Florida DBPR canonical mapping", () => {
  it("normalizes license numbers and fingerprints stably", () => {
    expect(normalizeLicenseNumber("cgc-012345")).toBe("CGC012345");
    expect(normalizeLicenseDigits("CGC0012345")).toBe("12345");
    expect(buildFingerprint({ b: 2, a: 1 })).toBe(buildFingerprint({ a: 1, b: 2 }));
  });

  it("maps fixture rows to canonical records", async () => {
    const records = [];
    for await (const raw of floridaDbprConstructionAdapter.streamRawRecords({
      filePath: fixturePath,
      fetchedAt: "2026-01-01T00:00:00.000Z",
      sourceLastModifiedAt: "2026-01-01T00:00:00.000Z",
    })) {
      records.push(await floridaDbprConstructionAdapter.normalize(raw));
    }

    expect(records).toHaveLength(5);
    expect(records[0]?.sourceId).toBe("us.fl.dbpr.construction");
    expect(records[0]?.license.licenseNumber).toBe("CGC012345");
    expect(records[0]?.license.tradeCategories).toEqual(["general_contracting"]);
    expect(records[0]?.status.normalized).toBe("active");
    expect(records[1]?.status.normalized).toBe("suspended");
    expect(records[2]?.status.normalized).toBe("inactive");
    expect(records[3]?.identity.dbaName).toBe("RIVERA, BUILDERS LLC");
    expect(records[4]?.license.tradeCategories).toEqual(["residential_contracting"]);
  });

  it("keeps unknown source values as warnings while producing canonical records", async () => {
    const rawRecords = [];
    const records = [];
    for await (const raw of floridaDbprConstructionAdapter.streamRawRecords({
      filePath: edgeFixturePath,
      fetchedAt: "2026-01-01T00:00:00.000Z",
    })) {
      rawRecords.push(raw);
      records.push(await floridaDbprConstructionAdapter.normalize(raw));
    }

    expect(records).toHaveLength(5);
    expect(records[0]?.identity.licenseeName).toBe('QUOTE, ALEX "AJ"');
    expect(rawRecords[1]?.warnings?.map((warning) => warning.code)).toEqual([
      "unknown_occupation_code",
      "unknown_primary_status_code",
      "unknown_secondary_status_code",
    ]);
    expect(records[1]?.license.tradeCategories).toEqual(["unknown"]);
    expect(records[1]?.status.normalized).toBe("unknown");
    expect(records[2]?.status.normalized).toBe("expired");
  });
});
