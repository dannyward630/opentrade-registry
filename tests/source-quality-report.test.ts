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
    expect(report.sourceCount).toBe(34);
    expect(report.stateCount).toBe(51);
    expect(report.researchedStateCount).toBe(34);
    expect(report.coverageByStatus.not_started).toBe(17);
    expect(report.sourcesByMaturity.registry_only).toBe(30);
    expect(report.sourcesByMaturity.fixture_adapter).toBe(3);
    expect(report.sourcesByMaturity.local_file_adapter).toBe(1);
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.pa.oag.home_improvement_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.oh.commerce.ocilb_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ct.dcp.home_improvement_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.wv.labor.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ak.commerce.construction_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.de.labor.construction_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.dc.dlcp.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.id.dopl.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ri.crlb.contractors");
    expect(report.bulkCandidates.map((source: { id: string }) => source.id)).toContain("us.fl.dbpr.construction");
  });

  it("keeps the database source seed synchronized with the file registry", () => {
    const result = spawnSync(process.execPath, ["scripts/generate-registry-source-seed.mjs", "--check"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});
