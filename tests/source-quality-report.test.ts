import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("source quality report", () => {
  it("summarizes registry quality in JSON form", () => {
    const result = spawnSync(process.execPath, ["scripts/source-quality-report.mjs", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");

    const report = JSON.parse(result.stdout);
    expect(report.sourceCount).toBe(19);
    expect(report.stateCount).toBe(51);
    expect(report.researchedStateCount).toBe(19);
    expect(report.sourcesByMaturity.registry_only).toBe(15);
    expect(report.sourcesByMaturity.fixture_adapter).toBe(3);
    expect(report.sourcesByMaturity.local_file_adapter).toBe(1);
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.pa.oag.home_improvement_contractors");
    expect(report.bulkCandidates.map((source: { id: string }) => source.id)).toContain("us.fl.dbpr.construction");
  });
});
