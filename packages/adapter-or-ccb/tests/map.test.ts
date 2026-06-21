import { join } from "node:path";
import { canonicalTradeLicenseRecordSchema } from "@opentrade/core";
import { describe, expect, it } from "vitest";
import { oregonCcbActiveLicensesAdapter } from "../src/source.js";

const fixturePath = join(process.cwd(), "packages", "adapter-or-ccb", "fixtures", "active-licenses-sample.csv");

describe("Oregon CCB canonical mapping", () => {
  it("maps fixture rows to canonical records with active-source caveats", async () => {
    const rawRecords = [];
    const records = [];
    for await (const raw of oregonCcbActiveLicensesAdapter.streamRawRecords({
      filePath: fixturePath,
      fetchedAt: "2026-01-01T00:00:00.000Z",
    })) {
      rawRecords.push(raw);
      records.push(await oregonCcbActiveLicensesAdapter.normalize(raw));
    }

    expect(records).toHaveLength(5);
    expect(canonicalTradeLicenseRecordSchema.parse(records[0])).toBeDefined();
    expect(records[0]?.sourceId).toBe("us.or.ccb.active_licenses");
    expect(records[0]?.license.tradeCategories).toEqual(["residential_contracting", "general_contracting"]);
    expect(records[0]?.status.normalized).toBe("active");
    expect(records[0]?.compliance?.bond).toBeDefined();
    expect(records[1]?.license.tradeCategories).toEqual(["commercial_contracting", "general_contracting"]);
    expect(records[1]?.status.normalized).toBe("expired");
    expect(records[2]?.license.tradeCategories).toEqual(["unknown"]);
    expect(rawRecords[2]?.warnings?.map((warning) => warning.code)).toEqual([
      "unknown_license_type",
      "missing_or_unparsed_expiration_date",
    ]);
    expect(records[3]?.license.licenseNumberNormalized).toBe(records[4]?.license.licenseNumberNormalized);
  });
});
