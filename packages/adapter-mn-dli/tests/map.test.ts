import { describe, expect, it } from "vitest";
import { buildFingerprint, type RawSourceRecord } from "@opentrade-registry/core";
import { MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID } from "../src/constants.js";
import { mapMinnesotaDliFields, MN_DLI_COLUMNS } from "../src/map.js";
import { mapMinnesotaDliTradeCategory, normalizeMinnesotaDliStatus } from "../src/normalize.js";
import { normalizeMinnesotaDliRecord } from "../src/source.js";

describe("Minnesota DLI mapping", () => {
  it("maps the current official nightly export columns", () => {
    const header = "Bus_Pers,License_Type,License_Subtype,Name,DBA_Name,Addr1,Addr2,City,St,Zip,Phone_No,Email_Address,Lic_Number,Status,Orig_Date,Exp_Date,Enforcement_Action,Renewal_in_Progress".split(",");
    const fields = [
      "Business",
      "Residential Contractor",
      "Residential Building Contractor",
      "North Star Builders, LLC",
      "North Star",
      "100 Lake St",
      "",
      "Minneapolis",
      "MN",
      "55401",
      "6125550100",
      "",
      "BC000001",
      "Issued",
      "01/15/2020",
      "12/31/2099",
      "0",
      "",
    ];

    const row = mapMinnesotaDliFields(fields, header);
    expect(row).toMatchObject({
      licenseNumber: "BC000001",
      licenseType: "Residential Building Contractor",
      name: "North Star Builders, LLC",
      dbaName: "North Star",
      status: "Issued",
      disciplineIndicator: null,
    });
  });

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
    const row = mapMinnesotaDliFields(MN_DLI_COLUMNS.map((column) => ({
      Bus_Pers: "Business",
      License_Type: "Residential Contractor",
      License_Subtype: "Residential Building Contractor",
      Name: "North Star Builders, LLC",
      Addr1: "100 Lake St",
      City: "Minneapolis",
      St: "MN",
      Zip: "55401",
      Phone_No: "6125550100",
      Lic_Number: "BC000001",
      Status: "Issued",
      Orig_Date: "01/15/2020",
      Exp_Date: "12/31/2099",
      Enforcement_Action: "0",
    })[column] ?? ""));
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
    expect(canonical.jurisdiction).toMatchObject({ country: "US", state: "MN" });
    expect(canonical.license.licenseNumberNormalized).toBe("BC000001");
    expect(canonical.license.tradeCategories).toEqual(["residential_contracting"]);
    expect(canonical.identity.businessName).toBe("North Star Builders, LLC");
    expect(canonical.status.normalized).toBe("active");
    expect(canonical.source.caveats).toContain("Minnesota DLI mapping is validated against the official nightly export columns; fixture rows remain hand-authored.");
    expect(canonical.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
