import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseCaliforniaCslbCsvLine, parseCaliforniaCslbCsvRow, streamCaliforniaCslbFile } from "../src/parse.js";

describe("California CSLB CSV parsing", () => {
  it("parses quoted fields and escaped quotes", () => {
    const fields = parseCaliforniaCslbCsvLine(
      '2345678,"Pacific Roof ""Plus""",Pacific Roof Plus,Contractor,C39-Roofing,Expired,03/20/2018,06/30/2020,200 Ocean Ave,Los Angeles,CA,90001,Los Angeles,2135550100,Casey Nguyen,RMO',
    );

    expect(fields[1]).toBe('Pacific Roof "Plus"');
  });

  it("maps CSV rows to normalized intermediate records", () => {
    const row = parseCaliforniaCslbCsvRow(
      "3456789,Central Valley Mechanical,,Contractor,C20-HVAC; C36-Plumbing,Suspended,07/01/2021,12/31/2099,300 Farm Rd,Fresno,CA,93721,Fresno,5595550100,Riley Patel,Officer",
    );

    expect(row.licenseNumber).toBe("3456789");
    expect(row.licenseNumberNormalized).toBe("3456789");
    expect(row.classifications).toEqual(["C20-HVAC", "C36-Plumbing"]);
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
