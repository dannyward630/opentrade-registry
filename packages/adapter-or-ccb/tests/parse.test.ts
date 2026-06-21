import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseOregonCcbCsvLine, parseOregonCcbCsvRow, streamOregonCcbCsvFile } from "../src/parse.js";

describe("Oregon CCB CSV parser", () => {
  it("parses quoted fields containing commas and escaped quotes", () => {
    const fields = parseOregonCcbCsvLine(
      'ORCCB002,Commercial General Contractor,1002,Business,03,Clackamas,06/30/2020,03/01/2018,Fixture Bond Co,20000,06/30/2020,Fixture Insurance Co,500000,06/30/2020,"CLACKAMAS CONSTRUCTION ""PLUS""",200 MAIN AVE,OREGON CITY,OR,97045,5035550101,,"LEE, CASEY",Nonexempt,Commercial',
    );

    expect(fields).toHaveLength(24);
    expect(fields[14]).toBe('CLACKAMAS CONSTRUCTION "PLUS"');
    expect(fields[21]).toBe("LEE, CASEY");
  });

  it("accepts reordered official columns and ignores extra columns", () => {
    const header = [
      "license_number",
      "full_name",
      "license_type",
      "related_key",
      "related_type",
      "county_code",
      "county_name",
      "lic_exp_date",
      "orig_regis_date",
      "bond_company",
      "bond_amount",
      "bond_exp_date",
      "ins_company",
      "ins_amount",
      "ins_exp_date",
      "address",
      "city",
      "state",
      "zip_code",
      "phone_number",
      "fax_number",
      "rmi_name",
      "exempt_text",
      "endorsement_text",
      "future_column",
    ];
    const row = parseOregonCcbCsvRow(
      'ORCCB001,"PORTLAND BUILDERS, LLC",Residential General Contractor,1001,Business,26,Multnomah,12/31/2099,01/15/2020,Fixture Bond Co,20000,12/31/2099,Fixture Insurance Co,500000,12/31/2099,100 RIVER ST,PORTLAND,OR,97201,5035550100,,"MORGAN, TAYLOR",Nonexempt,Residential,unused',
      header,
    );

    expect(row.licenseNumber).toBe("ORCCB001");
    expect(row.fullName).toBe("PORTLAND BUILDERS, LLC");
  });

  it("rejects files missing required columns", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-or-missing-column-"));
    const filePath = join(dir, "missing-column.csv");
    writeFileSync(filePath, "license_number,full_name\nOR001,ACME\n", "utf8");

    try {
      await expect(async () => {
        for await (const _record of streamOregonCcbCsvFile({ filePath })) {
          // consume stream to trigger header validation
        }
      }).rejects.toThrow(/missing required column/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
