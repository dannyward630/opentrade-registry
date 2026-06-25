import { describe, expect, it } from "vitest";
import { buildFingerprint, type RawSourceRecord } from "@opentrade/core";
import { MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID } from "../src/constants.js";
import { mapMinnesotaDliFields } from "../src/map.js";
import { mapMinnesotaDliTradeCategory, normalizeMinnesotaDliStatus } from "../src/normalize.js";
import { normalizeMinnesotaDliRecord } from "../src/source.js";

describe("Minnesota DLI mapping", () => {
  it("normalizes status values conservatively", () => {
    expect(normalizeMinnesotaDliStatus({ status: "Issued", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("active");
    expect(normalizeMinnesotaDliStatus({ status: "Expired", expirationDate: "2020-12-31T00:00:00.000Z" }).normalized).toBe("expired");
    expect(normalizeMinnesotaDliStatus({ status: "Suspended", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("suspended");
    expect(normalizeMinnesotaDliStatus({ status: "Mystery", expirationDate: null }).normalized).toBe("unknown");
  });

  it("maps obvious trade categories", () => {
    expect(mapMinnesotaDliTradeCategory("Residential Building Contractor")).toBe("residential_contracting");
    expect(mapMinnesotaDliTradeCategory("Residential Remodeler")).toBe("home_improvement");
    expect(mapMinnesotaDliTradeCategory("Plumbing Contractor")).toBe("plumbing");
    expect(mapMinnesotaDliTradeCategory("Electrical Contractor")).toBe("electrical");
    expect(mapMinnesotaDliTradeCategory("Boiler Credential")).toBe("unknown");
  });

  it("maps raw rows to canonical records with source caveats and fingerprints", () => {
    const row = mapMinnesotaDliFields([
      "BC000001",
      "Residential Building Contractor",
      "North Star Builders, LLC",
      "",
      "100 Lake St",
      "",
      "Minneapolis",
      "MN",
      "55401",
      "Hennepin",
      "6125550100",
      "Issued",
      "01/15/2020",
      "12/31/2099",
      "N",
    ]);
    const rawRecord: RawSourceRecord = {
      sourceId: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
      sourceUrl: "https://www.dli.mn.gov/license-and-registration-lookup",
      record: row,
      rowNumber: 1,
      fetchedAt: "2026-06-26T00:00:00.000Z",
      fingerprint: buildFingerprint(row.raw),
      warnings: [],
    };

    const canonical = normalizeMinnesotaDliRecord(rawRecord);

    expect(canonical.sourceId).toBe(MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID);
    expect(canonical.jurisdiction).toMatchObject({ country: "US", state: "MN", county: "Hennepin" });
    expect(canonical.license.licenseNumberNormalized).toBe("BC000001");
    expect(canonical.license.tradeCategories).toEqual(["residential_contracting"]);
    expect(canonical.identity.businessName).toBe("North Star Builders, LLC");
    expect(canonical.status.normalized).toBe("active");
    expect(canonical.source.caveats).toContain("Minnesota DLI fixture support is based on a tiny hand-authored sample, not the live DLI spreadsheet.");
    expect(canonical.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
