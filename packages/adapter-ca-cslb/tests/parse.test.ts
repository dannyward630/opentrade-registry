import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseCaliforniaCslbCsvLine, parseCaliforniaCslbCsvRow, streamCaliforniaCslbFile } from "../src/parse.js";
import { CA_CSLB_COLUMNS } from "../src/map.js";

describe("California CSLB CSV parsing", () => {
  it("parses quoted fields and escaped quotes", () => {
    const fields = parseCaliforniaCslbCsvLine(
      '2345678,06/27/2026,"Pacific Roof ""Plus"""',
    );

    expect(fields[2]).toBe('Pacific Roof "Plus"');
  });

  it("maps CSV rows to normalized intermediate records", () => {
    const row = parseCaliforniaCslbCsvRow(toCsvLine(CA_CSLB_COLUMNS.map((column) => ({
      LicenseNo: "3456789",
      BusinessName: "Central Valley Mechanical",
      BusinessType: "Corporation",
      "Classifications(s)": "C20;C36",
      PrimaryStatus: "Work Comp Susp",
      IssueDate: "07/01/2021",
      ExpirationDate: "12/31/2099",
      MailingAddress: "300 Farm Rd",
      City: "Fresno",
      State: "CA",
      ZIPCode: "93721",
      County: "Fresno",
      BusinessPhone: "5595550100",
    })[column] ?? "")));

    expect(row.licenseNumber).toBe("3456789");
    expect(row.licenseNumberNormalized).toBe("3456789");
    expect(row.classifications).toEqual(["C20", "C36"]);
    expect(row.issueDate).toBe("2021-07-01T00:00:00.000Z");
    expect(row.expirationDate).toBe("2099-12-31T00:00:00.000Z");
    expect(row.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("streams the official XLSX-shaped fixture", async () => {
    const records = [];
    for await (const record of streamCaliforniaCslbFile({
      filePath: join(process.cwd(), "packages/adapter-ca-cslb/fixtures/contractors-master-sample.xlsx"),
      fetchedAt: "2026-06-27T00:00:00.000Z",
    })) {
      records.push(record);
    }

    expect(records).toHaveLength(6);
    expect(records[0]?.sourceId).toBe("us.ca.cslb.contractors");
  });
});

function toCsvLine(fields: string[]): string {
  return fields.map((field) => /[,"]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field).join(",");
}
