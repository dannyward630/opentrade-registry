import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArizonaRocCsvLine, parseArizonaRocCsvRow, streamArizonaRocCsvFile } from "../src/parse.js";

describe("Arizona ROC CSV parser", () => {
  it("parses quoted commas and escaped quotes", () => {
    const fields = parseArizonaRocCsvLine('001002,"SONORAN ROOF ""PLUS""",,CR-42,Roofing,Specialty Dual,200 E AVE,TUCSON,AZ,85701,"LEE, CASEY",2018-03-01,2020-06-30,Active');
    expect(fields).toHaveLength(14);
    expect(fields[1]).toBe('SONORAN ROOF "PLUS"');
    expect(fields[10]).toBe("LEE, CASEY");
  });

  it("maps dates and preserves leading zero license numbers", () => {
    const row = parseArizonaRocCsvRow('001001,DESERT GENERAL,,B-1,General Commercial Contractor,Commercial,100 W ST,PHOENIX,AZ,85001,ALEX,01/15/2020,06/30/2099,Active');
    expect(row.licenseNumber).toBe("001001");
    expect(row.issueDate).toBe("2020-01-15T00:00:00.000Z");
  });

  it("rejects missing required headers", async () => {
    const directory = mkdtempSync(join(tmpdir(), "opentrade-az-header-"));
    const filePath = join(directory, "bad.csv");
    writeFileSync(filePath, "License No,Business Name\n001,ACME\n");
    try {
      await expect(async () => { for await (const _record of streamArizonaRocCsvFile({ filePath })) void _record; }).rejects.toThrow(/missing required column/i);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
