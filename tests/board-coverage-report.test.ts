import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("board coverage report", () => {
  it("reports complete terminal board coverage decisions", () => {
    const result = run("--json");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      completeness: "board_complete",
      inventoryCompleteness: "representative_source_baseline",
      jurisdictionCount: 56,
      tradeDomainCount: 14,
      decisionCount: 784,
      resolvedCount: 784,
      needsResearchCount: 0,
    });
  });

  it("holds the release gate until the board inventory is independently complete", () => {
    const result = run("--require-complete");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("board inventory is still a representative source baseline");
  });
});

function run(flag: string) {
  return spawnSync(process.execPath, ["scripts/board-coverage-report.mjs", flag], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}
