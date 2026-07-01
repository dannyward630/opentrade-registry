import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("coverage health report", () => {
  it("proves state and territory coverage indexes are complete and cross-linked", () => {
    const result = spawnSync(process.execPath, ["scripts/coverage-health.mjs", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");

    const report = JSON.parse(result.stdout);
    expect(report.ok).toBe(true);
    expect(report.sourceCount).toBe(62);
    expect(report.requiredStateCount).toBe(51);
    expect(report.stateCoverageRowCount).toBe(51);
    expect(report.researchedStateCount).toBe(51);
    expect(report.requiredTerritoryCount).toBe(5);
    expect(report.territoryCoverageRowCount).toBe(5);
    expect(report.researchedTerritoryCount).toBe(5);
    expect(report.missingStateCodes).toEqual([]);
    expect(report.missingTerritoryCodes).toEqual([]);
    expect(report.coverageSourceIdsMissingRegistry).toEqual([]);
    expect(report.sourcesMissingCoverage).toEqual([]);
    expect(report.mismatchedCoverageSources).toEqual([]);
    expect(report.sourcePathMismatches).toEqual([]);
    expect(report.adapterPackageMismatches).toEqual([]);
    expect(report.runtimeSourcesWithoutFixtures).toEqual([]);
    expect(report.missingFixturePaths).toEqual([]);
    expect(report.implementedSourcesMissingLevel4).toEqual([]);
    expect(report.implementedSourcesMissingVerificationReview).toEqual([]);
    expect(report.coverageStatusMismatches).toEqual([]);
    expect(report.failures).toEqual([]);
  });

  it("prints a concise human-readable coverage status", () => {
    const result = spawnSync(process.execPath, ["scripts/coverage-health.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("OpenTrade Registry coverage health");
    expect(result.stdout).toContain("status: ok");
    expect(result.stdout).toContain("state coverage: 51/51 researched rows");
    expect(result.stdout).toContain("territory coverage: 5/5 researched rows");
    expect(result.stdout).toContain("coverage indexes are complete, cross-linked, and maturity-aligned");
  });
});
