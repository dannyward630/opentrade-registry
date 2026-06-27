import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseMinnesotaDliCsvLine, parseMinnesotaDliCsvRow, streamMinnesotaDliFile } from "../src/parse.js";

describe("Minnesota DLI CSV parsing", () => {
  it("parses quoted fields and commas", () => {
    const fields = parseMinnesotaDliCsvLine(
      'BC000001,Residential Building Contractor,"North Star Builders, LLC",,100 Lake St,,Minneapolis,MN,55401,Hennepin,6125550100,Issued,01/15/2020,12/31/2099,N',
    );

    expect(fields[2]).toBe("North Star Builders, LLC");
  });

  it("maps CSV rows to normalized intermediate records", () => {
    const row = parseMinnesotaDliCsvRow(
      'EL000004,Electrical Contractor,Bright North Electric,,400 Circuit Blvd,,Rochester,MN,55901,Olmsted,5075550100,Issued,04/20/2021,12/31/2099,N',
    );

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
