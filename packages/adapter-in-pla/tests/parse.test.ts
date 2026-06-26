import { describe, expect, it } from "vitest";
import { IN_PLA_COLUMNS, parseIndianaPlaCsvLine, parseIndianaPlaCsvRow } from "../src/index.js";

describe("Indiana PLA CSV parsing", () => {
  it("parses quoted fields with commas", () => {
    const fields = parseIndianaPlaCsvLine(
      'HIC45600002,"Home Improvement Contractor, Registration",Expired,Indy Remodel Co,Indy Remodel,300 Oak Ave,Suite 4,Fort Wayne,IN,46802,Allen,2605550100,03/10/2018,06/30/2020,Home Improvement',
    );

    expect(fields[1]).toBe("Home Improvement Contractor, Registration");
    expect(fields).toHaveLength(IN_PLA_COLUMNS.length);
  });

  it("maps fixture rows and normalizes dates", () => {
    const row = parseIndianaPlaCsvRow(
      "PC12300001,Plumbing Contractor,Active,Hoosier Pipe Works LLC,,100 Market St,,Indianapolis,IN,46204,Marion,3175550100,01/15/2020,12/31/2099,Plumbing Commission",
    );

    expect(row.licenseNumber).toBe("PC12300001");
    expect(row.licenseNumberNormalized).toBe("PC12300001");
    expect(row.issueDate).toBe("2020-01-15T00:00:00.000Z");
    expect(row.expirationDate).toBe("2099-12-31T00:00:00.000Z");
    expect(row.dbaName).toBeNull();
    expect(row.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
