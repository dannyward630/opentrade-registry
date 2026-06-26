import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildIllinoisIdfprWarnings,
  illinoisIdfprRoofingContractorsAdapter,
  mapIllinoisIdfprTradeCategories,
  normalizeIllinoisIdfprRecord,
  normalizeIllinoisIdfprStatus,
  parseIllinoisIdfprCsvRow,
} from "../src/index.js";

const fixturePath = fileURLToPath(new URL("../fixtures/roofing-contractors-sample.csv", import.meta.url));

describe("Illinois IDFPR canonical mapping", () => {
  it("maps active roofing rows into canonical records", async () => {
    const [raw] = await collectRawRecords();
    const record = normalizeIllinoisIdfprRecord(raw);

    expect(record.sourceId).toBe("us.il.idfpr.roofing_contractors");
    expect(record.jurisdiction.state).toBe("IL");
    expect(record.license.licenseNumberNormalized).toBe("104000001");
    expect(record.license.tradeCategories).toEqual(["roofing"]);
    expect(record.status.normalized).toBe("active");
    expect(record.status.isCurrent).toBe(true);
    expect(record.source.caveats).toContain("Illinois IDFPR fixture support is based on a tiny hand-authored sample, not a live IDFPR export or lookup response.");
    expect(record.raw.fingerprint).toEqual(expect.any(String));
  });

  it("normalizes suspended, expired, pending, and non-roofing cases conservatively", async () => {
    const records = await collectRawRecords();
    const expired = normalizeIllinoisIdfprRecord(records[2]);
    const suspended = normalizeIllinoisIdfprRecord(records[3]);
    const nonRoofing = normalizeIllinoisIdfprRecord(records[4]);
    const pending = normalizeIllinoisIdfprRecord(records[5]);

    expect(expired.status.normalized).toBe("expired");
    expect(suspended.status.normalized).toBe("suspended");
    expect(nonRoofing.license.tradeCategories).toEqual(["unknown"]);
    expect(pending.status.normalized).toBe("pending");
    expect(pending.source.caveats).toContain("Illinois IDFPR row is missing a parseable expiration date.");
  });

  it("emits warnings for non-roofing and missing date rows", () => {
    const nonRoofing = parseIllinoisIdfprCsvRow("062000001,Professional Engineer,Licensed Professional Engineer,Active,02/10/2022,12/31/2099,Great Lakes Engineering,,Riley Snow,400 MAIN ST,,ROCKFORD,IL,61101,8155550104,Winnebago,,Division of Professional Regulation");
    const missingDate = parseIllinoisIdfprCsvRow("104999999,Roofing Contractor,Experimental Exterior Envelope,Pending Review,07/04/2023,,Prairie Envelope Lab,,Jordan North,500 PRAIRIE RD,,URBANA,IL,61801,2175550105,Champaign,,Division of Professional Regulation");

    expect(mapIllinoisIdfprTradeCategories(nonRoofing)).toEqual(["unknown"]);
    expect(normalizeIllinoisIdfprStatus(missingDate).normalized).toBe("pending");
    expect(buildIllinoisIdfprWarnings(nonRoofing).map((warning) => warning.code)).toContain("non_trade_license_type");
    expect(buildIllinoisIdfprWarnings(missingDate).map((warning) => warning.code)).toContain("missing_or_unparsed_expiration_date");
  });
});

async function collectRawRecords() {
  const records = [];
  for await (const raw of illinoisIdfprRoofingContractorsAdapter.streamRawRecords({ filePath: fixturePath })) {
    records.push(raw);
  }
  return records;
}
