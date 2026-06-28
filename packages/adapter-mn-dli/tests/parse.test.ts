import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseMinnesotaDliCsvLine, parseMinnesotaDliCsvRow, streamMinnesotaDliFile } from "../src/parse.js";
import { MN_DLI_COLUMNS } from "../src/map.js";

describe("Minnesota DLI CSV parsing", () => {
  it("parses quoted fields and commas", () => {
    const fields = parseMinnesotaDliCsvLine(
      'Business,Residential Contractor,Residential Building Contractor,"North Star Builders, LLC",,100 Lake St,,Minneapolis,MN,55401,6125550100,,BC000001,Issued,01/15/2020,12/31/2099,0,',
    );

    expect(fields[3]).toBe("North Star Builders, LLC");
  });

  it("maps CSV rows to normalized intermediate records", () => {
    const row = parseMinnesotaDliCsvRow(toCsvLine(MN_DLI_COLUMNS.map((column) => ({
      Bus_Pers: "Business",
      License_Type: "Electrical",
      License_Subtype: "Electrical Contractor",
      Name: "Bright North Electric",
      Addr1: "400 Circuit Blvd",
      City: "Rochester",
      St: "MN",
      Zip: "55901",
      Phone_No: "5075550100",
      Lic_Number: "EL000004",
      Status: "Issued",
      Orig_Date: "04/20/2021",
      Exp_Date: "12/31/2099",
      Enforcement_Action: "0",
    })[column] ?? "")));

    expect(row.licenseNumber).toBe("EL000004");
    expect(row.licenseNumberNormalized).toBe("EL000004");
    expect(row.licenseType).toBe("Electrical Contractor");
    expect(row.issueDate).toBe("2021-04-20T00:00:00.000Z");
    expect(row.expirationDate).toBe("2099-12-31T00:00:00.000Z");
    expect(row.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("streams the official XLSX-shaped fixture", async () => {
    const records = [];
    for await (const record of streamMinnesotaDliFile({
      filePath: join(process.cwd(), "packages/adapter-mn-dli/fixtures/licenses-registrations-sample.xlsx"),
      fetchedAt: "2026-06-27T00:00:00.000Z",
    })) {
      records.push(record);
    }

    expect(records).toHaveLength(6);
    expect(records[0]?.sourceId).toBe("us.mn.dli.licenses_registrations");
  });
});

function toCsvLine(fields: string[]): string {
  return fields.map((field) => /[,"]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field).join(",");
}
