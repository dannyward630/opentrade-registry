import { describe, expect, it } from "vitest";
import { parseTexasTdlrCsvLine, parseTexasTdlrCsvRow } from "../src/parse.js";

const header = [
  "LICENSE TYPE",
  "LICENSE NUMBER",
  "BUSINESS COUNTY",
  "BUSINESS NAME",
  "BUSINESS ADDRESS-LINE1",
  "BUSINESS ADDRESS-LINE2",
  "BUSINESS CITY, STATE ZIP",
  "BUSINESS TELEPHONE",
  "LICENSE EXPIRATION DATE (MMDDCCYY)",
  "OWNER NAME",
  "MAILING ADDRESS LINE1",
  "MAILING ADDRESS LINE2",
  "MAILING ADDRESS CITY, STATE ZIP",
  "MAILING ADDRESS COUNTY",
  "OWNER TELEPHONE",
  "LICENSE SUBTYPE",
  "CONTINUING EDUCATION FLAG",
];

describe("Texas TDLR CSV parser", () => {
  it("parses quoted fields containing commas", () => {
    const fields = parseTexasTdlrCsvLine(
      'Air Conditioning and Refrigeration Contractor,TACLA000001,TRAVIS,"AUSTIN COOLING, LLC",100 MAIN ST,STE 200,"AUSTIN, TX 78701",5125550100,12312099,"RIVERA, ALEX",PO BOX 100,,"AUSTIN, TX 78767",TRAVIS,5125550199,Class A Environmental Air,Y',
    );

    expect(fields).toHaveLength(17);
    expect(fields[3]).toBe("AUSTIN COOLING, LLC");
    expect(fields[9]).toBe("RIVERA, ALEX");
  });

  it("maps a source row using the official header names", () => {
    const row = parseTexasTdlrCsvRow(
      'Electrical Contractor,TECL000002,HARRIS,BRIGHT WIRE SERVICES,200 POWER RD,,"HOUSTON, TX 77002",7135550100,01012020,"NGUYEN, MORGAN",200 POWER RD,,"HOUSTON, TX 77002",HARRIS,,Electrical Contractor,N',
      header,
    );

    expect(row.licenseNumberNormalized).toBe("TECL000002");
    expect(row.expirationDate).toBe("2020-01-01T00:00:00.000Z");
    expect(row.ownerTelephone).toBeNull();
  });

  it("rejects malformed row widths", () => {
    expect(() => parseTexasTdlrCsvRow("too,short", header)).toThrow(/record width/i);
  });
});
