import { describe, expect, it } from "vitest";
import { parseWashingtonLniCsvLine, parseWashingtonLniCsvRow } from "../src/parse.js";

describe("Washington L&I CSV parser", () => {
  it("parses quoted fields containing commas", () => {
    const fields = parseWashingtonLniCsvLine(
      '"RAIN CITY BUILDERS, LLC",RAINCCB001JQ,CC,Construction Contractor,100 PINE ST,STE 200,SEATTLE,WA,98101,2065550100,01/15/2020,12/31/2099,LLC,Limited Liability Company,GEN,General Contractor,,,604000001,"MORGAN, TAYLOR",A,ACTIVE,',
    );

    expect(fields).toHaveLength(23);
    expect(fields[0]).toBe("RAIN CITY BUILDERS, LLC");
    expect(fields[19]).toBe("MORGAN, TAYLOR");
  });

  it("parses escaped quotes inside quoted fields", () => {
    const row = parseWashingtonLniCsvRow(
      '"SPOKANE ROOF ""PLUS""",SPOKRP002QZ,CC,Construction Contractor,200 MAPLE AVE,,SPOKANE,WA,99201,5095550100,03/01/2018,06/30/2020,CORP,Corporation,ROOF,Roofing,,,604000002,"LEE, CASEY",A,ACTIVE,',
    );

    expect(row.businessName).toBe('SPOKANE ROOF "PLUS"');
    expect(row.expirationDate).toBe("2020-06-30T00:00:00.000Z");
  });

  it("rejects malformed row widths", () => {
    expect(() => parseWashingtonLniCsvRow("too,short")).toThrow(/record width/i);
  });
});
