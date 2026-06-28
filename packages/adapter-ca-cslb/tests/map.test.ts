import { describe, expect, it } from "vitest";
import { buildFingerprint, canonicalTradeLicenseRecordSchema, type RawSourceRecord } from "@opentrade-registry/core";
import { CA_CSLB_CONTRACTORS_SOURCE_ID } from "../src/constants.js";
import { CA_CSLB_COLUMNS, mapCaliforniaCslbFields } from "../src/map.js";
import { mapCaliforniaCslbTradeCategories, normalizeCaliforniaCslbStatus } from "../src/normalize.js";
import { normalizeCaliforniaCslbRecord } from "../src/source.js";

describe("California CSLB mapping", () => {
  it("maps the current official master-license CSV columns", () => {
    const header = "LicenseNo,LastUpdate,BusinessName,BUS-NAME-2,FullBusinessName,MailingAddress,City,State,County,ZIPCode,country,BusinessPhone,BusinessType,IssueDate,ReissueDate,ExpirationDate,InactivationDate,ReactivationDate,PendingSuspension,PendingClassRemoval,PendingClassReplace,PrimaryStatus,SecondaryStatus,Classifications(s),AsbestosReg,WorkersCompCoverageType,WCInsuranceCompany,WCPolicyNumber,WCEffectiveDate,WCExpirationDate,WCCancellationDate,WCSuspendDate,CBSuretyCompany,CBNumber,CBEffectiveDate,CBCancellationDate,CBAmount,WBSuretyCompany,WBNumber,WBEffectiveDate,WBCancellationDate,WBAmount,DBSuretyCompany,DBNumber,DBEffectiveDate,DBCancellationDate,DBAmount,DateRequired,DiscpCaseRegion,DBBondReason,DBCaseNo,NAME-TP-2".split(",");
    const fields = new Array(header.length).fill("");
    const set = (column: string, value: string) => { fields[header.indexOf(column)] = value; };
    set("LicenseNo", "1234567");
    set("BusinessName", "Golden State Builders LLC");
    set("BUS-NAME-2", "Golden State Construction");
    set("MailingAddress", "100 Market St");
    set("City", "San Francisco");
    set("State", "CA");
    set("County", "San Francisco");
    set("ZIPCode", "94105");
    set("BusinessPhone", "4155550100");
    set("BusinessType", "LLC");
    set("IssueDate", "01/15/2019");
    set("ExpirationDate", "12/31/2099");
    set("PrimaryStatus", "CLEAR");
    set("Classifications(s)", "A;B");

    const row = mapCaliforniaCslbFields(fields, header);
    expect(row).toMatchObject({
      licenseNumber: "1234567",
      businessName: "Golden State Builders LLC",
      dbaName: "Golden State Construction",
      status: "CLEAR",
      classifications: ["A", "B"],
    });
  });

  it("normalizes statuses conservatively", () => {
    expect(normalizeCaliforniaCslbStatus({ status: "Active", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("active");
    expect(normalizeCaliforniaCslbStatus({ status: "Active", expirationDate: "2020-06-30T00:00:00.000Z" }).normalized).toBe("expired");
    expect(normalizeCaliforniaCslbStatus({ status: "Suspended", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("suspended");
    expect(normalizeCaliforniaCslbStatus({ status: "Revoked", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("revoked");
    expect(normalizeCaliforniaCslbStatus({ status: "Mystery", expirationDate: null }).normalized).toBe("unknown");
  });

  it("maps obvious classifications to trade categories", () => {
    expect(mapCaliforniaCslbTradeCategories({ classifications: ["B-General Building"] })).toEqual(["general_contracting"]);
    expect(mapCaliforniaCslbTradeCategories({ classifications: ["C39-Roofing"] })).toEqual(["roofing"]);
    expect(mapCaliforniaCslbTradeCategories({ classifications: ["C20-HVAC", "C36-Plumbing"] })).toEqual(["hvac", "plumbing"]);
    expect(mapCaliforniaCslbTradeCategories({ classifications: ["C46-Solar"] })).toEqual(["solar"]);
    expect(mapCaliforniaCslbTradeCategories({ classifications: ["Z99-Unmapped"] })).toEqual(["unknown"]);
  });

  it("maps rows to canonical records with source caveats and fingerprints", () => {
    const row = mapCaliforniaCslbFields(buildFields(CA_CSLB_COLUMNS, {
      LicenseNo: "1234567",
      BusinessName: "Golden State Builders LLC",
      MailingAddress: "100 Market St",
      City: "San Francisco",
      State: "CA",
      County: "San Francisco",
      ZIPCode: "94105",
      BusinessPhone: "4155550100",
      BusinessType: "LLC",
      IssueDate: "01/15/2019",
      ExpirationDate: "12/31/2099",
      PrimaryStatus: "CLEAR",
      "Classifications(s)": "A;B",
    }));
    const rawRecord: RawSourceRecord = {
      sourceId: CA_CSLB_CONTRACTORS_SOURCE_ID,
      sourceUrl: "https://www.cslb.ca.gov/onlineservices/dataportal/",
      record: row,
      rowNumber: 1,
      fetchedAt: "2026-06-26T00:00:00.000Z",
      fingerprint: buildFingerprint(row.raw),
      warnings: [],
    };

    const canonical = normalizeCaliforniaCslbRecord(rawRecord);

    expect(canonicalTradeLicenseRecordSchema.parse(canonical)).toBeDefined();
    expect(canonical.sourceId).toBe(CA_CSLB_CONTRACTORS_SOURCE_ID);
    expect(canonical.jurisdiction).toMatchObject({ country: "US", state: "CA", county: "San Francisco" });
    expect(canonical.license.licenseNumberNormalized).toBe("1234567");
    expect(canonical.license.tradeCategories).toEqual(["commercial_contracting", "general_contracting"]);
    expect(canonical.identity.businessName).toBe("Golden State Builders LLC");
    expect(canonical.status.normalized).toBe("active");
    expect(canonical.source.caveats).toContain("California CSLB mapping is validated against the official master-license CSV columns; fixture rows remain hand-authored.");
    expect(canonical.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});

function buildFields(header: readonly string[], values: Record<string, string>): string[] {
  return header.map((column) => values[column] ?? "");
}
