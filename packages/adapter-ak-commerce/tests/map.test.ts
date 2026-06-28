import { canonicalTradeLicenseRecordSchema } from "@opentrade-registry/core";
import { describe, expect, it } from "vitest";
import { mapAlaskaCommerceTradeCategories, normalizeAlaskaCommerceStatus } from "../src/normalize.js";
import { parseAlaskaCommerceCsvRow } from "../src/parse.js";
import { normalizeAlaskaCommerceRecord } from "../src/source.js";

describe("Alaska CBPL canonical mapping", () => {
  it("maps active general contractor rows", () => {
    const row = parseAlaskaCommerceCsvRow(
      'CONC123456,Construction Contractor,Construction Contractors,Active,01/15/2020,12/31/2099,"NORTHERN BUILDERS, LLC",Northern Builders,"LEE, MORGAN",100 GLACIER WAY,STE 10,ANCHORAGE,AK,99501,9075550101,General Contractor,General Construction,,Construction Contractors',
    );
    const canonical = normalizeAlaskaCommerceRecord({
      sourceId: "us.ak.commerce.construction_contractors",
      record: row,
      fetchedAt: "2026-06-26T00:00:00.000Z",
      fingerprint: row.fingerprint,
    });

    expect(canonicalTradeLicenseRecordSchema.parse(canonical)).toBeDefined();
    expect(canonical.license.licenseNumberNormalized).toBe("CONC123456");
    expect(canonical.license.tradeCategories).toEqual(["general_contracting"]);
    expect(canonical.status.normalized).toBe("active");
    expect(canonical.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("maps suspended, expired, non-trade, and unknown records conservatively", () => {
    const suspended = parseAlaskaCommerceCsvRow(
      "ROOF777777,Specialty Contractor,Construction Contractors,Suspended,03/01/2021,12/31/2099,Juneau Roof Works,,Avery Stone,300 HARBOR ST,,JUNEAU,AK,99801,9075550103,Specialty Contractor,Roofing,Administrative action,Construction Contractors",
    );
    const expired = parseAlaskaCommerceCsvRow(
      'CONR654321,Residential Contractor Endorsement,Construction Contractors,Expired,05/20/2018,06/30/2020,"FAIRBANKS HOMES ""PLUS""",,"PATEL, CASEY",200 RIVER RD,,FAIRBANKS,AK,99701,9075550102,Residential Contractor,Residential Construction,,Construction Contractors',
    );
    const nonTrade = parseAlaskaCommerceCsvRow(
      "COSM000001,Professional License,Barbers and Hairdressers,Active,02/10/2022,12/31/2099,Arctic Salon,,Riley Snow,400 MAIN ST,,NOME,AK,99762,9075550104,Cosmetology,Cosmetology,,Barbers and Hairdressers",
    );
    const unknown = parseAlaskaCommerceCsvRow(
      "MYST999999,Construction Contractor,Construction Contractors,Unknown,07/04/2023,,Kodiak Trades,,Jordan North,500 BAY RD,,KODIAK,AK,99615,9075550105,Specialty Contractor,Experimental Ice Road,,Construction Contractors",
    );

    expect(normalizeAlaskaCommerceStatus(suspended).normalized).toBe("suspended");
    expect(normalizeAlaskaCommerceStatus(expired).normalized).toBe("expired");
    expect(normalizeAlaskaCommerceStatus(unknown).normalized).toBe("unknown");
    expect(mapAlaskaCommerceTradeCategories(suspended)).toEqual(["roofing"]);
    expect(mapAlaskaCommerceTradeCategories(expired)).toEqual(["residential_contracting"]);
    expect(mapAlaskaCommerceTradeCategories(nonTrade)).toEqual(["unknown"]);
  });
});
