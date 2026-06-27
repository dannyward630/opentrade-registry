import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseCsvLine } from "../src/index.js";

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
});

function encodeField(value: string): string {
  if (!/[,\"]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
