import { describe, expect, it } from "vitest";
import { parseConstructionCsvLine, parseConstructionCsvRow } from "../src/parse.js";

describe("Florida DBPR construction CSV parser", () => {
  it("parses quoted fields containing commas", () => {
    const fields = parseConstructionCsvLine(
      '"06","CBC","DOE, JANE","ACME, INC.","","123 MAIN ST","","","MIAMI","FL","33101","13","0012345","C","A","01/01/2020","02/02/2020","03/03/2030","","","CBC012345",""',
    );

    expect(fields).toHaveLength(22);
    expect(fields[2]).toBe("DOE, JANE");
    expect(fields[3]).toBe("ACME, INC.");
  });

  it("parses escaped quotes inside quoted fields", () => {
    const row = parseConstructionCsvRow(
      '"06","CGC","QUOTE, ALEX ""AJ""","","","100 MAIN ST","","","TALLAHASSEE","FL","32399","37","0012345","C","A","01/01/2018","01/02/2018","08/31/2030","","","CGC012345",""',
    );

    expect(row.licenseeName).toBe('QUOTE, ALEX "AJ"');
  });

  it("accepts a missing trailing optional column", () => {
    const row = parseConstructionCsvRow(
      '"06","CRC","LEE, MORGAN","","","500 SHORT ROW","","","NAPLES","FL","34102","11","0055555","C","A","05/01/2014","05/02/2014","08/31/2030","","","CRC055555"',
    );

    expect(row.alternateLicenseNumberNormalized).toBe("CRC055555");
  });

  it("rejects malformed row widths", () => {
    expect(() => parseConstructionCsvRow('"too","short"')).toThrow(/record width/i);
  });
});
