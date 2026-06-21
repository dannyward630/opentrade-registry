import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { texasTdlrAllLicensesAdapter } from "../src/source.js";

const fixturePath = join(process.cwd(), "packages", "adapter-tx-tdlr", "fixtures", "all-licenses-sample.csv");

describe("Texas TDLR canonical mapping", () => {
  it("maps fixture rows to canonical records with conservative categories", async () => {
    const rawRecords = [];
    const records = [];
    for await (const raw of texasTdlrAllLicensesAdapter.streamRawRecords({
      filePath: fixturePath,
      fetchedAt: "2026-01-01T00:00:00.000Z",
    })) {
      rawRecords.push(raw);
      records.push(await texasTdlrAllLicensesAdapter.normalize(raw));
    }

    expect(records).toHaveLength(5);
    expect(records[0]?.sourceId).toBe("us.tx.tdlr.all_licenses");
    expect(records[0]?.license.licenseNumber).toBe("TACLA000001");
    expect(records[0]?.license.tradeCategories).toEqual(["hvac"]);
    expect(records[0]?.status.normalized).toBe("active");
    expect(records[1]?.license.tradeCategories).toEqual(["electrical"]);
    expect(records[1]?.status.normalized).toBe("expired");
    expect(records[2]?.license.tradeCategories).toEqual(["other"]);
    expect(records[2]?.status.normalized).toBe("unknown");
    expect(rawRecords[2]?.warnings?.map((warning) => warning.code)).toContain("missing_or_unparsed_expiration_date");
    expect(records[3]?.license.licenseNumberNormalized).toBe(records[4]?.license.licenseNumberNormalized);
  });
});
