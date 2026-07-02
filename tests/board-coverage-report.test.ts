import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("board coverage report", () => {
  it("reports the complete research worklist without claiming completion", () => {
    const result = run("--json");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      completeness: "research_in_progress",
      jurisdictionCount: 56,
      tradeDomainCount: 14,
      decisionCount: 784,
      resolvedCount: 276,
      needsResearchCount: 508,
    });
  });

  it("fails the release gate while any trade domain remains unresolved", () => {
    const result = run("--require-complete");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/508.*research/i);
  });
});

function run(flag: string) {
  return spawnSync(process.execPath, ["scripts/board-coverage-report.mjs", flag], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}
