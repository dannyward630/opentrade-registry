import { describe, expect, it } from "vitest";
import { buildFingerprint, canonicalTradeLicenseRecordSchema, type RawSourceRecord } from "@opentrade/core";
import { CA_CSLB_CONTRACTORS_SOURCE_ID } from "../src/constants.js";
import { mapCaliforniaCslbFields } from "../src/map.js";
import { mapCaliforniaCslbTradeCategories, normalizeCaliforniaCslbStatus } from "../src/normalize.js";
import { normalizeCaliforniaCslbRecord } from "../src/source.js";

describe("California CSLB mapping", () => {
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
    const row = mapCaliforniaCslbFields([
      "1234567",
      "Golden State Builders LLC",
      "",
      "Contractor",
      "A-General Engineering; B-General Building",
      "Active",
      "01/15/2019",
      "12/31/2099",
      "100 Market St",
      "San Francisco",
      "CA",
      "94105",
      "San Francisco",
      "4155550100",
      "Jordan Lee",
      "Qualifier",
    ]);
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
    expect(canonical.source.caveats).toContain("California CSLB fixture support is based on a tiny hand-authored sample, not the live CSLB master list.");
    expect(canonical.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});

