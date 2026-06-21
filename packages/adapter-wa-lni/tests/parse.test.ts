import { describe, expect, it } from "vitest";
import { parseWashingtonLniCsvLine, parseWashingtonLniCsvRow, streamWashingtonLniCsvFile } from "../src/parse.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

  it("accepts reordered official columns and ignores extra columns", () => {
    const header = [
      "ContractorLicenseNumber",
      "BusinessName",
      "ContractorLicenseTypeCode",
      "ContractorLicenseTypeCodeDesc",
      "Address1",
      "Address2",
      "City",
      "State",
      "Zip",
      "PhoneNumber",
      "LicenseEffectiveDate",
      "LicenseExpirationDate",
      "BusinessTypeCode",
      "BusinessTypeCodeDesc",
      "SpecialtyCode1",
      "SpecialtyCode1Desc",
      "SpecialtyCode2",
      "SpecialtyCode2Desc",
      "UBI",
      "PrimaryPrincipalName",
      "StatusCode",
      "ContractorLicenseStatus",
      "ContractorLicenseSuspendDate",
      "IgnoredFutureColumn",
    ];
    const row = parseWashingtonLniCsvRow(
      'RAINCCB001JQ,"RAIN CITY BUILDERS, LLC",CC,Construction Contractor,100 PINE ST,STE 200,SEATTLE,WA,98101,2065550100,01/15/2020,12/31/2099,LLC,Limited Liability Company,GEN,General Contractor,,,604000001,"MORGAN, TAYLOR",A,ACTIVE,,unused',
      header,
    );

    expect(row.licenseNumber).toBe("RAINCCB001JQ");
    expect(row.businessName).toBe("RAIN CITY BUILDERS, LLC");
  });

  it("rejects files missing required columns", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-wa-missing-column-"));
    const filePath = join(dir, "missing-column.csv");
    writeFileSync(filePath, "BusinessName,ContractorLicenseNumber\nACME,WA001\n", "utf8");

    try {
      await expect(async () => {
        for await (const _record of streamWashingtonLniCsvFile({ filePath })) {
          // consume stream to trigger header validation
        }
      }).rejects.toThrow(/missing required column/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
