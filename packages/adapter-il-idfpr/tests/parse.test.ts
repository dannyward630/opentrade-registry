import { describe, expect, it } from "vitest";
import { IL_IDFPR_COLUMNS, parseIllinoisIdfprCsvLine, parseIllinoisIdfprCsvRow } from "../src/index.js";

describe("Illinois IDFPR CSV parsing", () => {
  it("parses quoted fields and escaped quotes", () => {
    const fields = parseIllinoisIdfprCsvLine('104000002,Roofing Contractor,"Licensed Roofing Contractor",Expired,05/20/2018,06/30/2020,"SPRINGFIELD ""ROOFING, PLUS"" INC",,"PATEL, CASEY",200 CAPITOL AVE,,SPRINGFIELD,IL,62701,2175550102,Sangamon,,Division of Professional Regulation');

    expect(fields).toHaveLength(IL_IDFPR_COLUMNS.length);
    expect(fields[6]).toBe('SPRINGFIELD "ROOFING, PLUS" INC');
    expect(fields[8]).toBe("PATEL, CASEY");
  });

  it("maps fixture-shaped rows into normalized intermediate records", () => {
    const row = parseIllinoisIdfprCsvRow("104000001,Roofing Contractor,Licensed Roofing Contractor,Active,01/15/2020,12/31/2099,CHICAGO ROOF WORKS LLC,Chicago Roof Works,LEE MORGAN,100 LAKE ST,STE 12,CHICAGO,IL,60601,3125550101,Cook,,Division of Professional Regulation");

    expect(row.licenseNumber).toBe("104000001");
    expect(row.licenseNumberNormalized).toBe("104000001");
    expect(row.expirationDate).toBe("2099-12-31T00:00:00.000Z");
    expect(row.state).toBe("IL");
    expect(row.county).toBe("Cook");
    expect(row.fingerprint).toEqual(expect.any(String));
  });
});
