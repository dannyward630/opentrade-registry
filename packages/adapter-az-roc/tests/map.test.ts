import { canonicalTradeLicenseRecordSchema } from "@opentrade/core";
import { describe, expect, it } from "vitest";
import { parseArizonaRocCsvRow } from "../src/parse.js";
import { mapArizonaRocTradeCategories, normalizeArizonaRocStatus } from "../src/normalize.js";
import { normalizeArizonaRocRecord } from "../src/source.js";

describe("Arizona ROC mapping", () => {
  it("maps an active general contractor to a canonical record", () => {
    const row = parseArizonaRocCsvRow('001001,"DESERT GENERAL, LLC",Desert General,B-1,General Commercial Contractor,Commercial,100 W ST,PHOENIX,AZ,85001,"MORGAN, ALEX",2020-01-15,2099-06-30,Active');
    const record = normalizeArizonaRocRecord({ sourceId: "us.az.roc.contractors", record: row, fetchedAt: "2026-06-27T00:00:00.000Z", fingerprint: row.fingerprint });
    expect(canonicalTradeLicenseRecordSchema.parse(record)).toBeDefined();
    expect(record.license.licenseNumberNormalized).toBe("001001");
    expect(record.license.tradeCategories).toEqual(["general_contracting", "commercial_contracting"]);
    expect(record.status.normalized).toBe("active");
  });

  it("normalizes suspended, expired, and unknown values conservatively", () => {
    expect(normalizeArizonaRocStatus({ status: "Suspended", expirationDate: "2099-01-01T00:00:00.000Z" }).normalized).toBe("suspended");
    expect(normalizeArizonaRocStatus({ status: "Active", expirationDate: "2020-01-01T00:00:00.000Z" }).normalized).toBe("expired");
    expect(normalizeArizonaRocStatus({ status: "Under Review", expirationDate: null }).normalized).toBe("unknown");
    expect(mapArizonaRocTradeCategories({ classificationCode: "X-99", classificationLabel: "Unmapped", classType: "Other" })).toEqual(["unknown"]);
  });
});
