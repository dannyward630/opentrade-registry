import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAlaskaCommerceCsvLine, parseAlaskaCommerceCsvRow, streamAlaskaCommerceCsvFile } from "../src/parse.js";

describe("Alaska CBPL CSV parser", () => {
  it("parses quoted fields containing commas", () => {
    const fields = parseAlaskaCommerceCsvLine(
      'CONC123456,Construction Contractor,Construction Contractors,Active,01/15/2020,12/31/2099,"NORTHERN BUILDERS, LLC",Northern Builders,"LEE, MORGAN",100 GLACIER WAY,STE 10,ANCHORAGE,AK,99501,9075550101,General Contractor,General Construction,,Construction Contractors',
    );

    expect(fields).toHaveLength(19);
    expect(fields[6]).toBe("NORTHERN BUILDERS, LLC");
    expect(fields[8]).toBe("LEE, MORGAN");
  });

  it("parses escaped quotes inside quoted fields", () => {
    const row = parseAlaskaCommerceCsvRow(
      'CONR654321,Residential Contractor Endorsement,Construction Contractors,Expired,05/20/2018,06/30/2020,"FAIRBANKS HOMES ""PLUS""",,"PATEL, CASEY",200 RIVER RD,,FAIRBANKS,AK,99701,9075550102,Residential Contractor,Residential Construction,,Construction Contractors',
    );

    expect(row.businessName).toBe('FAIRBANKS HOMES "PLUS"');
    expect(row.expirationDate).toBe("2020-06-30T00:00:00.000Z");
  });

  it("rejects malformed row widths", () => {
    expect(() => parseAlaskaCommerceCsvRow("too,short")).toThrow(/record width/i);
  });

  it("accepts reordered columns", () => {
    const header = [
      "LicenseType",
      "LicenseNumber",
      "Program",
      "Status",
      "IssueDate",
      "ExpirationDate",
      "BusinessName",
      "DBAName",
      "LicenseeName",
      "AddressLine1",
      "AddressLine2",
      "City",
      "State",
      "Zip",
      "Phone",
      "Endorsement",
      "Classification",
      "Discipline",
      "Board",
    ];
    const row = parseAlaskaCommerceCsvRow(
      'Construction Contractor,CONC123456,Construction Contractors,Active,01/15/2020,12/31/2099,"NORTHERN BUILDERS, LLC",Northern Builders,"LEE, MORGAN",100 GLACIER WAY,STE 10,ANCHORAGE,AK,99501,9075550101,General Contractor,General Construction,,Construction Contractors',
      header,
    );

    expect(row.licenseNumber).toBe("CONC123456");
    expect(row.businessName).toBe("NORTHERN BUILDERS, LLC");
  });

  it("rejects files missing required columns", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-ak-missing-column-"));
    const filePath = join(dir, "missing-column.csv");
    writeFileSync(filePath, "LicenseNumber,LicenseType\nCONC123456,Construction Contractor\n", "utf8");

    try {
      await expect(async () => {
        for await (const _record of streamAlaskaCommerceCsvFile({ filePath })) {
          // consume stream to trigger header validation
        }
      }).rejects.toThrow(/missing required column/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
