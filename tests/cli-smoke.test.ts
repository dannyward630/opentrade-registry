import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cliPath = join(process.cwd(), "packages", "cli", "src", "index.ts");
const tsxPath = join(process.cwd(), "packages", "cli", "node_modules", ".bin", "tsx");
const sampleFixture = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-sample.csv");
const edgeFixture = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-edge-cases.csv");
const oregonFixture = join(process.cwd(), "packages", "adapter-or-ccb", "fixtures", "active-licenses-sample.csv");
const texasFixture = join(process.cwd(), "packages", "adapter-tx-tdlr", "fixtures", "all-licenses-sample.csv");
const washingtonFixture = join(process.cwd(), "packages", "adapter-wa-lni", "fixtures", "contractor-license-sample.csv");
const expectedJsonl = join(process.cwd(), "examples", "basic-sync", "expected", "sample-record.jsonl");
const expectedCsv = join(process.cwd(), "examples", "basic-sync", "expected", "sample-record.csv");

describe("opentrade CLI", () => {
  it("lists, shows, and validates sources", () => {
    const list = runCli(["sources", "list"]).stdout;
    expect(list).toContain("us.fl.dbpr.construction");
    expect(list).toContain("us.ca.cslb.contractors");
    expect(list).toContain("us.tx.tdlr.all_licenses");
    expect(list).toContain("us.wa.lni.contractors");
    expect(list).toContain("us.or.ccb.active_licenses");
    expect(list).toContain("us.pa.oag.home_improvement_contractors");
    expect(list).toContain("us.oh.commerce.ocilb_contractors");
    expect(list).toContain("us.wi.dsps.dwelling_trades");
    expect(list).toContain("us.mn.dli.licenses_registrations");
    expect(list).toContain("local_file_adapter");
    expect(list).toContain("fixture_adapter");
    const show = runCli(["sources", "show", "us.ca.cslb.contractors"]).stdout;
    expect(show).toContain("California CSLB Master List of Licensed Contractors");
    expect(show).toContain("maturity: registry_only");
    expect(show).toContain("coverage:");
    expect(show).toContain("known exclusions:");
    const pennsylvania = runCli(["sources", "show", "us.pa.oag.home_improvement_contractors"]).stdout;
    expect(pennsylvania).toContain("Pennsylvania Office of Attorney General Home Improvement Contractor Search");
    expect(pennsylvania).toContain("maturity: registry_only");
    expect(pennsylvania).toContain("active registrations only");
    const ohio = runCli(["sources", "show", "us.oh.commerce.ocilb_contractors"]).stdout;
    expect(ohio).toContain("Ohio Construction Industry Licensing Board Contractor License Lookup");
    expect(ohio).toContain("maturity: registry_only");
    expect(ohio).toContain("roster");
    expect(runCli(["sources", "validate"]).stdout).toContain("Validated 24 source registry entries.");
  });

  it("rejects registry-only sources for sync and verify with neutral wording", () => {
    const sync = runCli(
      [
        "sync",
        "us.ca.cslb.contractors",
        "--file",
        sampleFixture,
        "--out",
        join(tmpdir(), "unused-opentrade.jsonl"),
      ],
      2,
      { allowStderr: true },
    );
    expect(sync.stderr).toContain("Source us.ca.cslb.contractors is registered for metadata, but no sync adapter is implemented yet.");
    expect(sync.stderr).toContain("opentrade sources show us.ca.cslb.contractors");

    const verify = runCli(
      ["verify", "--source", "us.ca.cslb.contractors", "--file", sampleFixture, "--license", "CSLB000000"],
      2,
      { allowStderr: true },
    );
    expect(verify.stderr).toContain("Source us.ca.cslb.contractors is registered for metadata, but no verify adapter is implemented yet.");
    expect(verify.stderr).toContain("opentrade sources show us.ca.cslb.contractors");
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
      const lines = readFileSync(outPath, "utf8").trim().split("\n");
      const generated = JSON.parse(lines[0]);
      const expected = JSON.parse(readFileSync(expectedJsonl, "utf8"));
      expect(lines).toHaveLength(5);
      expect(Object.keys(generated).sort()).toEqual(Object.keys(expected).sort());
      expect(generated.license.licenseNumber).toBe(expected.license.licenseNumber);
      expect(generated.status.normalized).toBe(expected.status.normalized);
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
      const expectedHeader = readFileSync(expectedCsv, "utf8").split("\n")[0];
      expect(csv.split("\n")[0]).toBe(expectedHeader);
      expect(csv).toContain("CGC012345");
      expect(csv).toContain(",active,");
      expect(csv).not.toContain("rawRecordJson");
      expect(csv.trim().split("\n")).toHaveLength(6);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("syncs Texas TDLR fixture data to JSONL and CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-texas-"));
    try {
      const jsonlPath = join(dir, "texas.jsonl");
      const jsonl = runCli([
        "sync",
        "us.tx.tdlr.all_licenses",
        "--file",
        texasFixture,
        "--out",
        jsonlPath,
        "--json",
      ]);
      const json = JSON.parse(jsonl.stdout);
      expect(json.adapterMaturity).toBe("fixture_adapter");
      expect(json.stats.normalizedRecordCount).toBe(5);
      const lines = readFileSync(jsonlPath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(5);
      expect(JSON.parse(lines[0]).license.tradeCategories).toEqual(["hvac"]);

      const csvPath = join(dir, "texas.csv");
      runCli([
        "sync",
        "us.tx.tdlr.all_licenses",
        "--file",
        texasFixture,
        "--out",
        csvPath,
        "--format",
        "csv",
      ]);
      const csv = readFileSync(csvPath, "utf8");
      expect(csv).toContain("TACLA000001");
      expect(csv).toContain(",active,");
      expect(csv.trim().split("\n")).toHaveLength(6);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("syncs Oregon CCB fixture data to JSONL and CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-oregon-"));
    try {
      const jsonlPath = join(dir, "oregon.jsonl");
      const jsonl = runCli([
        "sync",
        "us.or.ccb.active_licenses",
        "--file",
        oregonFixture,
        "--out",
        jsonlPath,
        "--json",
      ]);
      const json = JSON.parse(jsonl.stdout);
      expect(json.adapterMaturity).toBe("fixture_adapter");
      expect(json.stats.normalizedRecordCount).toBe(5);
      expect(json.stats.warningCount).toBeGreaterThan(0);
      const lines = readFileSync(jsonlPath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(5);
      expect(JSON.parse(lines[0]).license.tradeCategories).toEqual(["residential_contracting", "general_contracting"]);

      const csvPath = join(dir, "oregon.csv");
      runCli([
        "sync",
        "us.or.ccb.active_licenses",
        "--file",
        oregonFixture,
        "--out",
        csvPath,
        "--format",
        "csv",
      ]);
      const csv = readFileSync(csvPath, "utf8");
      expect(csv).toContain("ORCCB001");
      expect(csv).toContain(",active,");
      expect(csv).not.toContain("bond_company");
      expect(csv.trim().split("\n")).toHaveLength(6);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("syncs Washington L&I fixture data to JSONL and CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-washington-"));
    try {
      const jsonlPath = join(dir, "washington.jsonl");
      const jsonl = runCli([
        "sync",
        "us.wa.lni.contractors",
        "--file",
        washingtonFixture,
        "--out",
        jsonlPath,
        "--json",
      ]);
      const json = JSON.parse(jsonl.stdout);
      expect(json.adapterMaturity).toBe("fixture_adapter");
      expect(json.stats.normalizedRecordCount).toBe(6);
      expect(json.stats.warningCount).toBeGreaterThan(0);
      const lines = readFileSync(jsonlPath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(6);
      expect(JSON.parse(lines[0]).license.tradeCategories).toEqual(["general_contracting"]);

      const csvPath = join(dir, "washington.csv");
      runCli([
        "sync",
        "us.wa.lni.contractors",
        "--file",
        washingtonFixture,
        "--out",
        csvPath,
        "--format",
        "csv",
      ]);
      const csv = readFileSync(csvPath, "utf8");
      expect(csv).toContain("RAINCCB001JQ");
      expect(csv).toContain(",active,");
      expect(csv).not.toContain("PrimaryPrincipalName");
      expect(csv.trim().split("\n")).toHaveLength(7);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports row-level normalization errors while writing valid records unless strict", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-row-errors-"));
    try {
      const fixturePath = join(dir, "washington-with-bad-row.csv");
      const fixture = readFileSync(washingtonFixture, "utf8");
      const badRow =
        'MISSING LICENSE,,CC,Construction Contractor,999 ERROR RD,,SEATTLE,WA,98101,2065550199,01/01/2020,12/31/2099,LLC,Limited Liability Company,GEN,General Contractor,,,604009999,"ERROR, CASEY",A,ACTIVE,';
      writeFileSync(fixturePath, `${fixture.trim()}\n${badRow}\n`, "utf8");

      const outPath = join(dir, "records.jsonl");
      const result = runCli([
        "sync",
        "us.wa.lni.contractors",
        "--file",
        fixturePath,
        "--out",
        outPath,
        "--json",
      ]);
      const json = JSON.parse(result.stdout);
      expect(json.stats.rawRecordCount).toBe(7);
      expect(json.stats.normalizedRecordCount).toBe(6);
      expect(json.stats.errorCount).toBe(1);
      expect(json.errors[0].message).toContain("Failed to normalize record 7");
      expect(readFileSync(outPath, "utf8").trim().split("\n")).toHaveLength(6);

      const strictOutPath = join(dir, "strict.jsonl");
      const strict = runCli(
        [
          "sync",
          "us.wa.lni.contractors",
          "--file",
          fixturePath,
          "--out",
          strictOutPath,
          "--strict",
        ],
        1,
        { allowStderr: true },
      );
      expect(strict.stderr).toContain("Failed to normalize record 7");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("requires explicit network opt-in and captures local HTTP metadata", async () => {
    const blocked = runCli(
      [
        "sync",
        "us.fl.dbpr.construction",
        "--url",
        "https://example.test/source.csv",
        "--out",
        join(tmpdir(), "blocked-opentrade.jsonl"),
      ],
      3,
      { allowStderr: true },
    );
    expect(blocked.stderr).toContain("Network sync requires --allow-network.");

    const fixture = readFileSync(sampleFixture, "utf8");
    const server = await startFixtureServer(fixture);
    const dir = mkdtempSync(join(tmpdir(), "opentrade-network-"));
    try {
      const outPath = join(dir, "records.jsonl");
      const result = await runCliAsync([
        "sync",
        "us.fl.dbpr.construction",
        "--url",
        server.url,
        "--allow-network",
        "--out",
        outPath,
        "--json",
      ]);
      const json = JSON.parse(result.stdout);
      expect(json.stats.normalizedRecordCount).toBe(5);
      expect(json.remoteSnapshot.sourceUrl).toBe(server.url);
      expect(json.remoteSnapshot.lastModifiedAt).toBe("2026-01-01T00:00:00.000Z");
      expect(json.remoteSnapshot.etag).toBe("\"fixture\"");
      expect(readFileSync(outPath, "utf8").trim().split("\n")).toHaveLength(5);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      await server.close();
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

  it("verifies Texas TDLR matched, not-found, ambiguous, and invalid license cases", () => {
    const matched = runCli([
      "verify",
      "--source",
      "us.tx.tdlr.all_licenses",
      "--file",
      texasFixture,
      "--license",
      "TACLA000001",
      "--json",
    ]);
    expect(JSON.parse(matched.stdout).result).toBe("matched");

    const notFound = runCli(
      ["verify", "--source", "us.tx.tdlr.all_licenses", "--file", texasFixture, "--license", "TACLA999999"],
      4,
    );
    expect(notFound.stdout).toContain("not_found");

    const ambiguous = runCli(
      ["verify", "--source", "us.tx.tdlr.all_licenses", "--file", texasFixture, "--license", "TACLA000004"],
      5,
    );
    expect(ambiguous.stdout).toContain("ambiguous");

    const invalid = runCli(["verify", "--source", "us.tx.tdlr.all_licenses", "--file", texasFixture, "--license", "!!!"], 2);
    expect(invalid.stdout).toContain("missing_required_input");
  });

  it("verifies Oregon CCB matched, not-found, ambiguous, and invalid license cases", () => {
    const matched = runCli([
      "verify",
      "--source",
      "us.or.ccb.active_licenses",
      "--file",
      oregonFixture,
      "--license",
      "ORCCB001",
      "--json",
    ]);
    expect(JSON.parse(matched.stdout).result).toBe("matched");

    const notFound = runCli(
      ["verify", "--source", "us.or.ccb.active_licenses", "--file", oregonFixture, "--license", "ORCCB999"],
      4,
    );
    expect(notFound.stdout).toContain("not_found");

    const ambiguous = runCli(
      ["verify", "--source", "us.or.ccb.active_licenses", "--file", oregonFixture, "--license", "ORCCB004"],
      5,
    );
    expect(ambiguous.stdout).toContain("ambiguous");

    const invalid = runCli(["verify", "--source", "us.or.ccb.active_licenses", "--file", oregonFixture, "--license", "!!!"], 2);
    expect(invalid.stdout).toContain("missing_required_input");
  });

  it("verifies Washington L&I matched, not-found, ambiguous, and invalid license cases", () => {
    const matched = runCli([
      "verify",
      "--source",
      "us.wa.lni.contractors",
      "--file",
      washingtonFixture,
      "--license",
      "RAINCCB001JQ",
      "--json",
    ]);
    expect(JSON.parse(matched.stdout).result).toBe("matched");

    const notFound = runCli(
      ["verify", "--source", "us.wa.lni.contractors", "--file", washingtonFixture, "--license", "WALNI999999"],
      4,
    );
    expect(notFound.stdout).toContain("not_found");

    const ambiguous = runCli(
      ["verify", "--source", "us.wa.lni.contractors", "--file", washingtonFixture, "--license", "DUPWA0005AA"],
      5,
    );
    expect(ambiguous.stdout).toContain("ambiguous");

    const invalid = runCli(["verify", "--source", "us.wa.lni.contractors", "--file", washingtonFixture, "--license", "!!!"], 2);
    expect(invalid.stdout).toContain("missing_required_input");
  });
});

async function startFixtureServer(body: string): Promise<{ url: string; close(): Promise<void> }> {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/csv");
    response.setHeader("last-modified", "Thu, 01 Jan 2026 00:00:00 GMT");
    response.setHeader("etag", "\"fixture\"");
    response.end(body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start fixture server.");
  }

  return {
    url: `http://127.0.0.1:${address.port}/source.csv`,
    close: () => closeServer(server),
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function runCli(args: string[], expectedStatus = 0, options: { allowStderr?: boolean } = {}) {
  const result = spawnSync(tsxPath, [cliPath, "--", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  expect(result.status).toBe(expectedStatus);
  if (!options.allowStderr) {
    expect(result.stderr).toBe("");
  }
  return result;
}

function runCliAsync(args: string[], expectedStatus = 0, options: { allowStderr?: boolean } = {}): Promise<{ stdout: string; stderr: string; status: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsxPath, [cliPath, "--", ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      try {
        expect(status).toBe(expectedStatus);
        if (!options.allowStderr) {
          expect(stderr).toBe("");
        }
        resolve({ stdout, stderr, status });
      } catch (error) {
        reject(error);
      }
    });
  });
}
