import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { streamTabularFileRows } from "../src/index.js";

describe("tabular file reader", () => {
  it("streams string-valued rows from an XLSX worksheet", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-xlsx-test-"));
    const filePath = join(directory, "licenses.xlsx");
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Licenses");
      sheet.addRow(["License Number", "Business Name", "Expires"]);
      sheet.addRow(["CSL-001", "Example Builders", new Date("2027-01-31T00:00:00.000Z")]);
      sheet.addRow(["CSL-002", "Trailing Blank"]);
      await workbook.xlsx.writeFile(filePath);

      const rows = [];
      for await (const row of streamTabularFileRows(filePath)) {
        rows.push(row);
      }

      expect(rows).toEqual([
        ["License Number", "Business Name", "Expires"],
        ["CSL-001", "Example Builders", "2027-01-31"],
        ["CSL-002", "Trailing Blank", ""],
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects compressed files and archive entry counts beyond configured limits", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-xlsx-limits-"));
    const filePath = join(directory, "limits.xlsx");
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet("Licenses").addRow(["License Number"]);
      await workbook.xlsx.writeFile(filePath);

      await expect(async () => {
        for await (const _row of streamTabularFileRows(filePath, { maxCompressedBytes: 10 })) void _row;
      }).rejects.toThrow(/compressed byte limit/i);
      await expect(async () => {
        for await (const _row of streamTabularFileRows(filePath, { maxEntries: 1 })) void _row;
      }).rejects.toThrow(/entry limit/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
