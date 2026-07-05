import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("board coverage report", () => {
  it("reports complete terminal board coverage decisions", () => {
    const result = run("--json");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      completeness: "board_complete",
      jurisdictionCount: 56,
      tradeDomainCount: 14,
      decisionCount: 784,
      resolvedCount: 784,
      needsResearchCount: 0,
    });
  });

  it("passes the release gate when every trade domain is terminal", () => {
    const result = run("--require-complete");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});

function run(flag: string) {
  return spawnSync(process.execPath, ["scripts/board-coverage-report.mjs", flag], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}
