import { describe, expect, it } from "vitest";
import {
  buildFingerprint,
  canonicalTradeLicenseRecordSchema,
  adapterMaturitySchema,
  normalizeLicenseNumber,
  sourceDiscoveryStatusSchema,
  sourceRegistryEntrySchema,
} from "@opentrade/core";
import {
  FL_DBPR_CONSTRUCTION_SOURCE_ID,
  floridaDbprConstructionAdapter,
  normalizeDbprStatus,
} from "@opentrade/adapter-fl-dbpr";

describe("public package imports", () => {
  it("imports stable public APIs from core and the Florida adapter", () => {
    expect(normalizeLicenseNumber("cgc-012345")).toBe("CGC012345");
    expect(buildFingerprint({ a: 1 })).toMatch(/^[a-f0-9]{64}$/);
    expect(canonicalTradeLicenseRecordSchema).toBeDefined();
    expect(sourceRegistryEntrySchema).toBeDefined();
    expect(adapterMaturitySchema.parse("registry_only")).toBe("registry_only");
    expect(sourceDiscoveryStatusSchema.parse("researched")).toBe("researched");
    expect(FL_DBPR_CONSTRUCTION_SOURCE_ID).toBe("us.fl.dbpr.construction");
    expect(floridaDbprConstructionAdapter.sourceId).toBe("us.fl.dbpr.construction");
    expect(normalizeDbprStatus({ primaryStatusCode: "S", secondaryStatusCode: "A" }).normalized).toBe("suspended");
  });
});
