import { describe, expect, it } from "vitest";
import { buildSqliteCacheExample } from "../examples/sqlite-cache/example.js";

describe("SQLite cache example", () => {
  it("turns the fixture-derived JSONL sample into SQLite insert payloads", () => {
    const result = buildSqliteCacheExample();

    expect(result.schemaSql).toContain("create table if not exists opentrade_license_records");
    expect(result.insertSql).toContain("insert into opentrade_license_records");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      sourceId: "us.fl.dbpr.construction",
      licenseNumberNormalized: "CGC012345",
      fingerprint: "3638d35922d21100d9d938b3a9e8fb92eb1def65226438c12b739969791d92e5",
    });
    expect(result.rows[0]?.values).toContain("example-import-run");
  });
});
