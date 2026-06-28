import fc from "fast-check";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsvLine, streamCsvFileRows } from "../src/index.js";

describe("CSV parser properties", () => {
  it("round-trips arbitrary single-line fields", () => {
    const field = fc.string({ maxLength: 80 }).filter((value) => !/[\r\n]/.test(value));
    fc.assert(
      fc.property(fc.array(field, { minLength: 1, maxLength: 40 }), (fields) => {
        expect(parseCsvLine(fields.map(encodeField).join(","))).toEqual(fields);
      }),
      { numRuns: 1_000 },
    );
  });

  it.each([
    '"unterminated',
    'plain"quote,value',
    '"closed"trailing,value',
  ])("rejects malformed quoting: %s", (line) => {
    expect(() => parseCsvLine(line)).toThrow(/malformed csv/i);
  });

  it("isolates malformed rows while preserving physical row numbers", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-csv-isolation-"));
    const filePath = join(directory, "rows.csv");
    try {
      await writeFile(filePath, 'license,status\nGOOD1,ACTIVE\n"broken,ACTIVE\nGOOD2,EXPIRED\n', "utf8");
      const errors: Array<{ rowNumber?: number; message: string }> = [];
      const rows = [];
      for await (const row of streamCsvFileRows(filePath, { onError: (error) => errors.push(error) })) {
        rows.push(row);
      }

      expect(rows.map((row) => row.fields)).toEqual([
        ["license", "status"],
        ["GOOD1", "ACTIVE"],
        ["GOOD2", "EXPIRED"],
      ]);
      expect(rows.map((row) => row.rowNumber)).toEqual([1, 2, 4]);
      expect(errors).toEqual([{ rowNumber: 3, message: "Malformed CSV: unterminated quoted field." }]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function encodeField(value: string): string {
  if (!/[,\"]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
