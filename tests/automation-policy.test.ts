import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const codeqlWorkflow = readFileSync(".github/workflows/codeql.yml", "utf8");
const dependabotConfig = readFileSync(".github/dependabot.yml", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

describe("lean GitHub automation policy", () => {
  it("uses one pull-request runner without dropping dependency review", () => {
    const jobsBlock = ciWorkflow.split("\njobs:\n")[1] ?? "";
    expect(jobsBlock.match(/^  [a-z][a-z-]+:\n/gm)).toHaveLength(1);
    expect(ciWorkflow).toContain("uses: actions/dependency-review-action@");
    expect(ciWorkflow).toContain("run: corepack pnpm verify:ci");
    expect(ciWorkflow).not.toContain("run: corepack pnpm security:audit");
  });

  it("keeps a dependency-free Markdown-only gate", () => {
    expect(ciWorkflow).toContain("name: Detect Markdown-only changes");
    expect(ciWorkflow).toContain("name: Check Markdown-only changes");
    expect(ciWorkflow).toContain("node scripts/docs-check.mjs");
    expect(ciWorkflow).toContain("node scripts/cleanliness-scan.mjs");
    expect(ciWorkflow).toContain("node scripts/files-check.mjs");
  });

  it("uses compiled CLI smoke tests only after a workspace build", () => {
    const command = packageJson.scripts["verify:ci"];
    expect(command).toBeDefined();
    expect(command?.indexOf("corepack pnpm build")).toBeLessThan(command?.indexOf("corepack pnpm test:compiled-cli") ?? -1);
    expect(packageJson.scripts["test:compiled-cli"]).toContain("OPENTRADE_TEST_COMPILED_CLI=1");
  });

  it("runs dormant CodeQL and routine dependency updates monthly", () => {
    expect(codeqlWorkflow).toContain('cron: "17 4 1 * *"');
    expect(codeqlWorkflow).toContain('paths-ignore:');
    expect(dependabotConfig.match(/interval: "monthly"/g)).toHaveLength(2);
    expect(dependabotConfig).toContain("routine-dependencies:");
    expect(dependabotConfig).toContain("routine-actions:");
    expect(dependabotConfig).not.toContain('interval: "weekly"');
  });
});
