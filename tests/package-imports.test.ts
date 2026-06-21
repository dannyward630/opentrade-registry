import { describe, expect, it } from "vitest";
import {
  buildFingerprint,
  canonicalTradeLicenseRecordSchema,
  adapterMaturitySchema,
  normalizeLicenseNumber,
  parseCsvLine,
  sourceDiscoveryStatusSchema,
  sourceRegistryEntrySchema,
} from "@opentrade/core";
import {
  FL_DBPR_CONSTRUCTION_SOURCE_ID,
  floridaDbprConstructionAdapter,
  normalizeDbprStatus,
} from "@opentrade/adapter-fl-dbpr";
import {
  normalizeOregonCcbStatus,
  oregonCcbActiveLicensesAdapter,
  OR_CCB_ACTIVE_LICENSES_SOURCE_ID,
} from "@opentrade/adapter-or-ccb";
import {
  texasTdlrAllLicensesAdapter,
  TX_TDLR_ALL_LICENSES_SOURCE_ID,
  normalizeTexasTdlrStatus,
} from "@opentrade/adapter-tx-tdlr";
import {
  normalizeWashingtonLniStatus,
  washingtonLniContractorsAdapter,
  WA_LNI_CONTRACTORS_SOURCE_ID,
} from "@opentrade/adapter-wa-lni";

describe("public package imports", () => {
  it("imports stable public APIs from core and the Florida adapter", () => {
    expect(normalizeLicenseNumber("cgc-012345")).toBe("CGC012345");
    expect(parseCsvLine('"ACME, INC.",CGC012345')).toEqual(["ACME, INC.", "CGC012345"]);
    expect(buildFingerprint({ a: 1 })).toMatch(/^[a-f0-9]{64}$/);
    expect(canonicalTradeLicenseRecordSchema).toBeDefined();
    expect(sourceRegistryEntrySchema).toBeDefined();
    expect(adapterMaturitySchema.parse("registry_only")).toBe("registry_only");
    expect(sourceDiscoveryStatusSchema.parse("researched")).toBe("researched");
    expect(FL_DBPR_CONSTRUCTION_SOURCE_ID).toBe("us.fl.dbpr.construction");
    expect(floridaDbprConstructionAdapter.sourceId).toBe("us.fl.dbpr.construction");
    expect(normalizeDbprStatus({ primaryStatusCode: "S", secondaryStatusCode: "A" }).normalized).toBe("suspended");
    expect(OR_CCB_ACTIVE_LICENSES_SOURCE_ID).toBe("us.or.ccb.active_licenses");
    expect(oregonCcbActiveLicensesAdapter.sourceId).toBe("us.or.ccb.active_licenses");
    expect(
      normalizeOregonCcbStatus({
        expirationDate: "2099-12-31T00:00:00.000Z",
      } as Parameters<typeof normalizeOregonCcbStatus>[0]).normalized,
    ).toBe("active");
    expect(TX_TDLR_ALL_LICENSES_SOURCE_ID).toBe("us.tx.tdlr.all_licenses");
    expect(texasTdlrAllLicensesAdapter.sourceId).toBe("us.tx.tdlr.all_licenses");
    expect(normalizeTexasTdlrStatus({ expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("active");
    expect(WA_LNI_CONTRACTORS_SOURCE_ID).toBe("us.wa.lni.contractors");
    expect(washingtonLniContractorsAdapter.sourceId).toBe("us.wa.lni.contractors");
    expect(
      normalizeWashingtonLniStatus({
        statusCode: "S",
        statusLabel: "SUSPENDED",
        expirationDate: "2099-12-31T00:00:00.000Z",
      } as Parameters<typeof normalizeWashingtonLniStatus>[0]).normalized,
    ).toBe("suspended");
  });
});
