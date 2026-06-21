import { describe, expect, it } from "vitest";
import { canonicalTradeLicenseRecordSchema } from "@opentrade/core";
import { mapWashingtonLniTradeCategories, normalizeWashingtonLniStatus } from "../src/normalize.js";
import { parseWashingtonLniCsvRow } from "../src/parse.js";
import { normalizeWashingtonLniRecord } from "../src/source.js";

describe("Washington L&I canonical mapping", () => {
  it("maps active general contractor rows", () => {
    const row = parseWashingtonLniCsvRow(
      '"RAIN CITY BUILDERS, LLC",RAINCCB001JQ,CC,Construction Contractor,100 PINE ST,STE 200,SEATTLE,WA,98101,2065550100,01/15/2020,12/31/2099,LLC,Limited Liability Company,GEN,General Contractor,,,604000001,"MORGAN, TAYLOR",A,ACTIVE,',
    );
    const record = normalizeWashingtonLniRecord({
      sourceId: "us.wa.lni.contractors",
      record: row,
      fetchedAt: "2026-06-21T00:00:00.000Z",
      fingerprint: row.fingerprint,
    });

    expect(canonicalTradeLicenseRecordSchema.parse(record)).toBeDefined();
    expect(record.license.licenseNumberNormalized).toBe("RAINCCB001JQ");
    expect(record.license.tradeCategories).toEqual(["general_contracting"]);
    expect(record.status.normalized).toBe("active");
    expect(record.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("maps suspended and expired records conservatively", () => {
    const suspended = parseWashingtonLniCsvRow(
      'CASCADE MECHANICAL,CASCMH003KT,CC,Construction Contractor,300 RIVER RD,,TACOMA,WA,98402,2535550100,05/10/2019,11/30/2099,LLC,Limited Liability Company,HVAC,Heating Ventilation Air Conditioning,,,604000003,"PATEL, SAM",S,SUSPENDED,02/01/2024',
    );
    const expired = parseWashingtonLniCsvRow(
      '"SPOKANE ROOF ""PLUS""",SPOKRP002QZ,CC,Construction Contractor,200 MAPLE AVE,,SPOKANE,WA,99201,5095550100,03/01/2018,06/30/2020,CORP,Corporation,ROOF,Roofing,,,604000002,"LEE, CASEY",A,ACTIVE,',
    );

    expect(normalizeWashingtonLniStatus(suspended).normalized).toBe("suspended");
    expect(normalizeWashingtonLniStatus(expired).normalized).toBe("expired");
    expect(mapWashingtonLniTradeCategories(suspended)).toEqual(["hvac"]);
    expect(mapWashingtonLniTradeCategories(expired)).toEqual(["roofing"]);
  });
});
