import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cliPath = join(process.cwd(), "packages", "cli", "src", "index.ts");
const tsxPath = join(process.cwd(), "packages", "cli", "node_modules", ".bin", "tsx");
const sampleFixture = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-sample.csv");
const edgeFixture = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-edge-cases.csv");

describe("opentrade CLI", () => {
  it("lists, shows, and validates sources", () => {
    expect(runCli(["sources", "list"]).stdout).toContain("us.fl.dbpr.construction");
    expect(runCli(["sources", "show", "us.fl.dbpr.construction"]).stdout).toContain("Florida DBPR Construction Industry Licenses");
    expect(runCli(["sources", "validate"]).stdout).toContain("Validated 2 source registry entries.");
  });

  it("syncs fixture data to JSONL with structured stats", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-jsonl-"));
    try {
      const outPath = join(dir, "records.jsonl");
      const result = runCli([
        "sync",
        "us.fl.dbpr.construction",
        "--file",
        sampleFixture,
        "--out",
        outPath,
        "--json",
      ]);

      const json = JSON.parse(result.stdout);
      expect(json.format).toBe("jsonl");
      expect(json.stats.rawRecordCount).toBe(5);
      expect(json.stats.normalizedRecordCount).toBe(5);
      expect(readFileSync(outPath, "utf8").trim().split("\n")).toHaveLength(5);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("syncs fixture data to safe CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-csv-"));
    try {
      const outPath = join(dir, "records.csv");
      runCli([
        "sync",
        "us.fl.dbpr.construction",
        "--file",
        sampleFixture,
        "--out",
        outPath,
        "--format",
        "csv",
      ]);

      const csv = readFileSync(outPath, "utf8");
      expect(csv.split("\n")[0]).toBe(
        "sourceId,licenseNumber,licenseNumberNormalized,typeLabel,tradeCategories,status,expirationDate,licenseeName,dbaName,sourceUrl,fetchedAt,fingerprint",
      );
      expect(csv).toContain("CGC012345");
      expect(csv).toContain(",active,");
      expect(csv).not.toContain("rawRecordJson");
      expect(csv.trim().split("\n")).toHaveLength(6);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verifies matched, not-found, ambiguous, and invalid license cases", () => {
    const matched = runCli([
      "verify",
      "--source",
      "us.fl.dbpr.construction",
      "--file",
      sampleFixture,
      "--license",
      "CGC012345",
      "--json",
    ]);
    expect(JSON.parse(matched.stdout).result).toBe("matched");

    const notFound = runCli(
      ["verify", "--source", "us.fl.dbpr.construction", "--file", sampleFixture, "--license", "CGC000000"],
      4,
    );
    expect(notFound.stdout).toContain("not_found");
    expect(notFound.stdout).toContain("No matching record was found in this source as of the checked time.");

    const ambiguous = runCli(
      ["verify", "--source", "us.fl.dbpr.construction", "--file", edgeFixture, "--license", "CGC077777"],
      5,
    );
    expect(ambiguous.stdout).toContain("ambiguous");

    const invalid = runCli(["verify", "--source", "us.fl.dbpr.construction", "--file", sampleFixture, "--license", "!!!"], 2);
    expect(invalid.stdout).toContain("missing_required_input");
  });
});

function runCli(args: string[], expectedStatus = 0) {
  const result = spawnSync(tsxPath, [cliPath, "--", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  expect(result.status).toBe(expectedStatus);
  expect(result.stderr).toBe("");
  return result;
}
