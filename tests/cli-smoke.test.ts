import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";

const cliPath = join(process.cwd(), "packages", "cli", "src", "index.ts");
const require = createRequire(import.meta.url);
const tsxPath = require.resolve("tsx/cli");
const sampleFixture = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-sample.csv");
const edgeFixture = join(process.cwd(), "packages", "adapter-fl-dbpr", "fixtures", "construction-license-edge-cases.csv");
const arizonaFixture = join(process.cwd(), "packages", "adapter-az-roc", "fixtures", "contractor-license-sample.csv");
const californiaFixture = join(process.cwd(), "packages", "adapter-ca-cslb", "fixtures", "contractors-master-sample.xlsx");
const oregonFixture = join(process.cwd(), "packages", "adapter-or-ccb", "fixtures", "active-licenses-sample.csv");
const texasFixture = join(process.cwd(), "packages", "adapter-tx-tdlr", "fixtures", "all-licenses-sample.csv");
const washingtonFixture = join(process.cwd(), "packages", "adapter-wa-lni", "fixtures", "contractor-license-sample.csv");
const minnesotaFixture = join(process.cwd(), "packages", "adapter-mn-dli", "fixtures", "licenses-registrations-sample.xlsx");
const expectedJsonl = join(process.cwd(), "examples", "basic-sync", "expected", "sample-record.jsonl");
const expectedCsv = join(process.cwd(), "examples", "basic-sync", "expected", "sample-record.csv");
const CLI_SMOKE_TIMEOUT_MS = 180_000;

vi.setConfig({ testTimeout: CLI_SMOKE_TIMEOUT_MS });

describe("opentrade CLI", () => {
  it("prints release-current help text for local-first and opt-in URL sync", () => {
    const help = runCli(["help"]).stdout;
    expect(help).toContain("Default commands do not contact agency sites.");
    expect(help).toContain("Network sync and verification require --allow-network.");
    expect(help).toContain("opentrade sources readiness [--json]");
    expect(help).toContain("opentrade sources coverage [--json]");
    expect(help).toContain("opentrade sources list [--state CA]");
    expect(help).toContain("--research-outcome network_opt_in");
    expect(help).not.toContain("adapter_candidate");
    expect(help).toContain("opentrade sources list [--implemented | --registry-only | --bulk-candidates] [--json]");
    expect(help).toContain("opentrade sync <sourceId> --allow-network [--url <sourceUrl>] --out <path>");
    expect(help).toContain("--resumable");
    expect(help).toContain("--resume-run <importRunId>");
    expect(help).toContain("--checkpoint-interval <records>");
    expect(help).toContain("opentrade verify --source <sourceId> --allow-network [--url <sourceUrl>] --license <licenseNumber>");
    expect(help).toContain("adapter maturity");
    expect(help).not.toContain("v0.1 does not download live agency data");
  });

  it("lists, shows, and validates sources", () => {
    const list = runCli(["sources", "list"]).stdout;
    expect(list).toContain("us.fl.dbpr.construction");
    expect(list).toContain("us.as.doc.business_licenses");
    expect(list).toContain("us.ca.cslb.contractors");
    expect(list).toContain("us.gu.clb.contractors");
    expect(list).toContain("us.mp.bpl.professional_licenses");
    expect(list).toContain("us.pr.daco.contractors");
    expect(list).toContain("us.tx.tdlr.all_licenses");
    expect(list).toContain("us.vi.dlca.contractors_trades");
    expect(list).toContain("us.wa.lni.contractors");
    expect(list).toContain("us.or.ccb.active_licenses");
    expect(list).toContain("us.pa.oag.home_improvement_contractors");
    expect(list).toContain("us.oh.commerce.ocilb_contractors");
    expect(list).toContain("us.wi.dsps.dwelling_trades");
    expect(list).toContain("us.mn.dli.licenses_registrations");
    expect(list).toContain("us.ak.commerce.construction_contractors");
    expect(list).toContain("us.az.roc.contractors");
    expect(list).toContain("us.de.labor.construction_contractors");
    expect(list).toContain("us.dc.dlcp.contractors");
    expect(list).toContain("us.id.dopl.contractors");
    expect(list).toContain("us.il.idfpr.roofing_contractors");
    expect(list).toContain("us.in.pla.professional_licenses");
    expect(list).toContain("us.ks.ag.roofing_registration");
    expect(list).toContain("us.ky.dhbc.trades");
    expect(list).toContain("us.ms.msboc.contractors");
    expect(list).toContain("us.ri.crlb.contractors");
    expect(list).toContain("us.ct.dcp.home_improvement_contractors");
    expect(list).toContain("us.md.dllr.home_improvement_contractors");
    expect(list).toContain("us.me.pfr.professional_licenses");
    expect(list).toContain("us.mo.pr.professional_licenses");
    expect(list).toContain("us.mt.dli.contractor_registration");
    expect(list).toContain("us.ne.dol.contractor_registration");
    expect(list).toContain("us.nh.oplc.trades");
    expect(list).toContain("us.nj.dca.home_improvement_contractors");
    expect(list).toContain("us.nm.rld.construction_industries");
    expect(list).toContain("us.nd.sos.contractors");
    expect(list).toContain("us.ny.dos.licensee_search");
    expect(list).toContain("us.ok.cib.trades");
    expect(list).toContain("us.sd.dlr.plumbing");
    expect(list).toContain("us.vt.sos.residential_contractors");
    expect(list).toContain("us.wv.labor.contractors");
    expect(list).toContain("us.wy.firemarshal.electrical");
    expect(list).toContain("local_file_adapter");
    expect(list).toContain("network_opt_in");
    expect(list).toContain("blocked");
    expect(list).toContain("level_4");
    const show = runCli(["sources", "show", "us.ca.cslb.contractors"]).stdout;
    expect(show).toContain("California CSLB Master List of Licensed Contractors");
    expect(show).toContain("maturity: local_file_adapter");
    expect(show).toContain("quality level: 4");
    expect(show).toContain("coverage:");
    expect(show).toContain("known exclusions:");
    const pennsylvania = runCli(["sources", "show", "us.pa.oag.home_improvement_contractors"]).stdout;
    expect(pennsylvania).toContain("Pennsylvania Office of Attorney General Home Improvement Contractor Search");
    expect(pennsylvania).toContain("maturity: blocked");
    expect(pennsylvania).toContain("active registrations only");
    const ohio = runCli(["sources", "show", "us.oh.commerce.ocilb_contractors"]).stdout;
    expect(ohio).toContain("Ohio Construction Industry Licensing Board Contractor License Lookup");
    expect(ohio).toContain("maturity: blocked");
    expect(ohio).toContain("research outcome: blocked");
    expect(ohio).toContain("next action:");
    expect(ohio).toContain("roster");
    const connecticut = runCli(["sources", "show", "us.ct.dcp.home_improvement_contractors"]).stdout;
    expect(connecticut).toContain("Connecticut DCP eLicense Home Improvement Contractor Lookup");
    expect(connecticut).toContain("maturity: blocked");
    const westVirginia = runCli(["sources", "show", "us.wv.labor.contractors"]).stdout;
    expect(westVirginia).toContain("West Virginia Division of Labor Contractor License Search");
    expect(westVirginia).toContain("maturity: blocked");
    const florida = runCli(["sources", "show", "us.fl.dbpr.construction"]).stdout;
    expect(florida).toContain("quality level: 4");
    expect(florida).toContain("verification caveats:");
    expect(florida).toContain("No matching record means no match in this source at the checked time");
    const alaska = runCli(["sources", "show", "us.ak.commerce.construction_contractors"]).stdout;
    expect(alaska).toContain("Alaska CBPL Construction Contractor License Search");
    expect(alaska).toContain("maturity: blocked");
    expect(alaska).toContain("technical access controls");
    const rhodeIsland = runCli(["sources", "show", "us.ri.crlb.contractors"]).stdout;
    expect(rhodeIsland).toContain("Rhode Island CRLB Registrant and Licensee Search");
    expect(rhodeIsland).toContain("maturity: blocked");
    const illinois = runCli(["sources", "show", "us.il.idfpr.roofing_contractors"]).stdout;
    expect(illinois).toContain("Illinois IDFPR Roofing Contractor License Lookup");
    expect(illinois).toContain("maturity: blocked");
    expect(illinois).toContain("no stable public downloadable source shape");
    const mississippi = runCli(["sources", "show", "us.ms.msboc.contractors"]).stdout;
    expect(mississippi).toContain("Mississippi State Board of Contractors License Search");
    expect(mississippi).toContain("maturity: blocked");
    const hawaii = runCli(["sources", "show", "us.hi.dcca.contractors"]).stdout;
    expect(hawaii).toContain("Hawaii DCCA PVL Contractor License Search");
    expect(hawaii).toContain("maturity: blocked");
    const georgiaTrades = runCli(["sources", "show", "us.ga.sos.construction_industry_trades"]).stdout;
    expect(georgiaTrades).toContain("Georgia Construction Industry Licensed Trades Search");
    expect(georgiaTrades).toContain("maturity: blocked");
    const georgiaAsbestos = runCli(["sources", "show", "us.ga.epd.asbestos_contractors"]).stdout;
    expect(georgiaAsbestos).toContain("Georgia EPD Licensed Asbestos Abatement Contractors");
    expect(georgiaAsbestos).toContain("not updated regularly");
    const vermont = runCli(["sources", "show", "us.vt.sos.residential_contractors"]).stdout;
    expect(vermont).toContain("Vermont Secretary of State Residential Contractor Registry");
    expect(vermont).toContain("maturity: blocked");
    const guam = runCli(["sources", "show", "us.gu.clb.contractors"]).stdout;
    expect(guam).toContain("Guam Contractors Licensing Board Contractors Listing");
    expect(guam).toContain("maturity: blocked");
    const puertoRico = runCli(["sources", "show", "us.pr.daco.contractors"]).stdout;
    expect(puertoRico).toContain("Puerto Rico DACO Registered Contractors List");
    expect(puertoRico).toContain("maturity: blocked");
    expect(runCli(["sources", "validate"]).stdout).toContain("Validated 83 source registry entries.");
  }, CLI_SMOKE_TIMEOUT_MS);

  it("filters source listings for discovery workflows", () => {
    const california = runCli(["sources", "list", "--state", "CA"]).stdout;
    expect(california).toContain("us.ca.cslb.contractors");
    expect(california).not.toContain("us.fl.dbpr.construction");

    const implemented = runCli(["sources", "list", "--implemented"]).stdout;
    expect(implemented).not.toContain("us.ak.commerce.construction_contractors");
    expect(implemented).toContain("us.ca.cslb.contractors");
    expect(implemented).toContain("us.fl.dbpr.asbestos_contractors");
    expect(implemented).toContain("us.fl.dbpr.construction");
    expect(implemented).toContain("us.fl.dbpr.electrical_contractors");
    expect(implemented).not.toContain("us.il.idfpr.roofing_contractors");
    expect(implemented).not.toContain("us.in.pla.professional_licenses");
    expect(implemented).toContain("us.mn.dli.licenses_registrations");
    expect(implemented).toContain("us.or.ccb.active_licenses");
    expect(implemented).toContain("us.tx.tdlr.all_licenses");
    expect(implemented).toContain("us.wa.lni.contractors");

    const registryOnlyJson = JSON.parse(runCli(["sources", "list", "--registry-only", "--json"]).stdout);
    expect(registryOnlyJson).toHaveLength(0);

    const bulkCandidatesJson = JSON.parse(runCli(["sources", "list", "--bulk-candidates", "--json"]).stdout);
    expect(bulkCandidatesJson.map((source: { id: string }) => source.id)).toEqual([]);

    const blockedJson = JSON.parse(runCli(["sources", "list", "--research-outcome", "blocked", "--json"]).stdout);
    expect(blockedJson).toHaveLength(74);
    expect(blockedJson.map((source: { id: string }) => source.id)).toContain("us.pa.oag.home_improvement_contractors");

    const level4Json = JSON.parse(runCli(["sources", "list", "--quality-level", "4", "--json"]).stdout);
    expect(level4Json.map((source: { id: string }) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);

    const noMatch = runCli(["sources", "list", "--state", "ZZ"]).stdout;
    expect(noMatch).toContain("No source registry entries matched the requested filters.");

    const invalidQuality = runCli(["sources", "list", "--quality-level", "not-a-number"], 2, { allowStderr: true });
    expect(invalidQuality.stderr).toContain("Invalid numeric value for --quality-level");

    const invalidMaturity = runCli(["sources", "list", "--maturity", "fixture"], 2, { allowStderr: true });
    expect(invalidMaturity.stderr).toContain("Invalid value for --maturity");
  }, CLI_SMOKE_TIMEOUT_MS);

  it("summarizes terminal source readiness", () => {
    const readiness = runCli(["sources", "readiness"]).stdout;
    expect(readiness).toContain("OpenTrade source readiness");
    expect(readiness).toContain("sources: 83");
    expect(readiness).toContain("implemented adapter sources: 9");
    expect(readiness).toContain("terminal source decisions: 83");
    expect(readiness).toContain("blocked sources: 74");
    expect(readiness).toContain("- us.az.roc.contractors (bulk_csv, network_opt_in, level_4)");
    expect(readiness).toContain("- us.ca.cslb.contractors (bulk_csv, local_file_adapter, level_4)");
    expect(readiness).toContain("- us.fl.dbpr.asbestos_contractors (bulk_csv, network_opt_in, level_4)");
    expect(readiness).toContain("- us.fl.dbpr.construction (bulk_csv, network_opt_in, level_4)");
    expect(readiness).toContain("- us.fl.dbpr.electrical_contractors (bulk_csv, network_opt_in, level_4)");
    expect(readiness).toContain("- us.mn.dli.licenses_registrations (bulk_csv, local_file_adapter, level_4)");
    expect(readiness).toContain("- us.or.ccb.active_licenses (bulk_csv, network_opt_in, level_4)");
    expect(readiness).toContain("- us.tx.tdlr.all_licenses (bulk_csv, network_opt_in, level_4)");
    expect(readiness).toContain("- us.wa.lni.contractors (bulk_csv, network_opt_in, level_4)");
    expect(readiness).toContain("unimplemented bulk-shaped candidates: 0");
    expect(readiness).toContain("research outcomes:");
    expect(readiness).toContain("- blocked: 74");
    expect(readiness).toContain("download/export research candidates: 0");
    expect(readiness).toContain("lookup automation constraint sources: 0");
    expect(readiness).toContain("terminal implementation or blocker outcome");

    const json = JSON.parse(runCli(["sources", "readiness", "--json"]).stdout);
    expect(json.sourceCount).toBe(83);
    expect(json.implementedAdapterSources.map((source: { id: string }) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(json.unimplementedBulkAdapterCandidates.map((source: { id: string }) => source.id)).toEqual([]);
    expect(json.downloadResearchCandidates).toEqual([]);
    expect(json.lookupAutomationConstraintSources).toEqual([]);
    expect(json.sourcesByResearchOutcome.blocked).toBe(74);
    expect(json.registryOnlySourceCount).toBe(0);
  }, CLI_SMOKE_TIMEOUT_MS);

  it("summarizes state and territory source coverage", () => {
    const coverage = runCli(["sources", "coverage"]).stdout;
    expect(coverage).toContain("OpenTrade source coverage");
    expect(coverage).toContain("states and DC: 51/51 researched");
    expect(coverage).toContain("major territories: 5/5 researched");
    expect(coverage).toContain("- blocked: 46");
    expect(coverage).toContain("- local_file_supported: 2");
    expect(coverage).toContain("- network_opt_in_supported: 3");
    expect(coverage).not.toContain("- AK: blocked");
    expect(coverage).toContain("- CA: local_file_supported (us.ca.cslb.contractors)");
    expect(coverage).toContain("- FL: network_opt_in_supported (us.fl.dbpr.asbestos_contractors, us.fl.dbpr.construction, us.fl.dbpr.electrical_contractors)");
    expect(coverage).toContain("not proof of complete statewide licensing coverage");

    const json = JSON.parse(runCli(["sources", "coverage", "--json"]).stdout);
    expect(json.stateCount).toBe(51);
    expect(json.researchedStateCount).toBe(51);
    expect(json.territoryCount).toBe(5);
    expect(json.researchedTerritoryCount).toBe(5);
    expect(json.stateCoverageByStatus).toEqual({
      blocked: 46,
      local_file_supported: 2,
      network_opt_in_supported: 3,
    });
    expect(json.territoryCoverageByStatus).toEqual({
      blocked: 5,
    });
    expect(json.states.find((row: { state: string }) => row.state === "AK").sourceIds).toEqual([
      "us.ak.commerce.construction_contractors",
      "us.ak.commerce.electrical_administrators",
      "us.ak.commerce.mechanical_administrators",
    ]);
    expect(json.states.find((row: { state: string }) => row.state === "CA").sourceIds).toEqual(["us.ca.cslb.contractors"]);
    expect(json.states.find((row: { state: string }) => row.state === "FL").sourceIds).toEqual([
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
    ]);
    expect(json.states.find((row: { state: string }) => row.state === "NC").sourceIds).toEqual([
      "us.nc.ncbeec.electrical_contractors",
      "us.nc.nclbgc.general_contractors",
      "us.nc.nclicensing.plumbing_heating_fire_sprinkler",
      "us.nc.refrigerationboard.refrigeration_contractors",
    ]);
    expect(json.states.find((row: { state: string }) => row.state === "TX").sourceIds).toEqual([
      "us.tx.dshs.asbestos",
      "us.tx.tdlr.all_licenses",
      "us.tx.tsbpe.plumbing",
    ]);
    expect(json.states.find((row: { state: string }) => row.state === "MN").sourceIds).toEqual(["us.mn.dli.licenses_registrations"]);
    expect(json.territories.map((row: { territory: string }) => row.territory)).toEqual(["AS", "GU", "MP", "PR", "VI"]);
  }, CLI_SMOKE_TIMEOUT_MS);

  it("rejects registry-only sources for sync and verify with neutral wording", () => {
    const sync = runCli(
      [
        "sync",
        "us.pa.oag.home_improvement_contractors",
        "--file",
        sampleFixture,
        "--out",
        join(tmpdir(), "unused-opentrade.jsonl"),
      ],
      2,
      { allowStderr: true },
    );
    expect(sync.stderr).toContain("Source us.pa.oag.home_improvement_contractors is registered for metadata, but no sync adapter is implemented yet.");
    expect(sync.stderr).toContain("opentrade sources show us.pa.oag.home_improvement_contractors");

    const verify = runCli(
      ["verify", "--source", "us.pa.oag.home_improvement_contractors", "--file", sampleFixture, "--license", "PA000000"],
      2,
      { allowStderr: true },
    );
    expect(verify.stderr).toContain("Source us.pa.oag.home_improvement_contractors is registered for metadata, but no verify adapter is implemented yet.");
    expect(verify.stderr).toContain("opentrade sources show us.pa.oag.home_improvement_contractors");

    for (const sourceId of [
      "us.ak.commerce.construction_contractors",
      "us.il.idfpr.roofing_contractors",
      "us.in.pla.professional_licenses",
      "us.ct.dcp.home_improvement_contractors",
      "us.md.dllr.home_improvement_contractors",
      "us.nj.dca.home_improvement_contractors",
      "us.nm.rld.construction_industries",
      "us.wv.labor.contractors",
      "us.de.labor.construction_contractors",
      "us.dc.dlcp.contractors",
      "us.id.dopl.contractors",
      "us.ri.crlb.contractors",
      "us.ks.ag.roofing_registration",
      "us.ky.dhbc.trades",
      "us.ms.msboc.contractors",
      "us.hi.dcca.contractors",
      "us.ga.epd.asbestos_contractors",
      "us.ga.sos.construction_industry_trades",
      "us.me.pfr.professional_licenses",
      "us.mo.pr.professional_licenses",
      "us.mt.dli.contractor_registration",
      "us.ne.dol.contractor_registration",
      "us.nh.oplc.trades",
      "us.ny.dos.licensee_search",
      "us.nd.sos.contractors",
      "us.ok.cib.trades",
      "us.sd.dlr.plumbing",
      "us.vt.sos.residential_contractors",
      "us.wy.firemarshal.electrical",
      "us.as.doc.business_licenses",
      "us.gu.clb.contractors",
      "us.mp.bpl.professional_licenses",
      "us.pr.daco.contractors",
      "us.vi.dlca.contractors_trades",
    ]) {
      const unsupportedSync = runCli(
        ["sync", sourceId, "--file", sampleFixture, "--out", join(tmpdir(), `unused-${sourceId}.jsonl`)],
        2,
        { allowStderr: true },
      );
      expect(unsupportedSync.stderr).toContain(`Source ${sourceId} is registered for metadata, but no sync adapter is implemented yet.`);

      const unsupported = runCli(
        ["verify", "--source", sourceId, "--file", sampleFixture, "--license", "UNKNOWN"],
        2,
        { allowStderr: true },
      );
      expect(unsupported.stderr).toContain(`Source ${sourceId} is registered for metadata, but no verify adapter is implemented yet.`);
    }
  }, CLI_SMOKE_TIMEOUT_MS);

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
      expect(generated.schemaVersion).toBe("1.0");
      expect(Object.keys(generated).filter((key) => key !== "schemaVersion").sort()).toEqual(Object.keys(expected).sort());
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

  it("syncs to and verifies from a SQLite cache", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-cli-cache-"));
    try {
      const cachePath = join(dir, "licenses.sqlite");
      const sync = runCli(["sync", "us.fl.dbpr.construction", "--file", sampleFixture, "--cache", cachePath, "--json"]);
      const syncJson = JSON.parse(sync.stdout);
      expect(syncJson.cachePath).toBe(cachePath);
      expect(syncJson.outputPath).toBeUndefined();
      expect(syncJson.stats.normalizedRecordCount).toBe(5);
      expect(syncJson.importRun).toMatchObject({
        sourceId: "us.fl.dbpr.construction",
        status: "completed",
        normalizedRecordCount: 5,
      });
      expect(syncJson.importRun.sourceSha256).toMatch(/^[a-f0-9]{64}$/);

      const matched = runCli(["verify", "--source", "us.fl.dbpr.construction", "--cache", cachePath, "--license", "CGC012345", "--json"]);
      const matchedJson = JSON.parse(matched.stdout);
      expect(matchedJson.result).toBe("matched");
      expect(matchedJson.matchedRecord.schemaVersion).toBe("1.0");
      const notFound = runCli(["verify", "--source", "us.fl.dbpr.construction", "--cache", cachePath, "--license", "CGC999999"], 4);
      expect(notFound.stdout).toContain("not_found");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("syncs California CSLB fixture data to JSONL and CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-california-"));
    try {
      const jsonlPath = join(dir, "california.jsonl");
      const jsonl = runCli([
        "sync",
        "us.ca.cslb.contractors",
        "--file",
        californiaFixture,
        "--out",
        jsonlPath,
        "--json",
      ]);
      const json = JSON.parse(jsonl.stdout);
      expect(json.adapterMaturity).toBe("local_file_adapter");
      expect(json.stats.normalizedRecordCount).toBe(6);
      expect(json.stats.warningCount).toBeGreaterThan(0);
      const lines = readFileSync(jsonlPath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(6);
      expect(JSON.parse(lines[0]).license.tradeCategories).toEqual(["commercial_contracting", "general_contracting"]);

      const csvPath = join(dir, "california.csv");
      runCli([
        "sync",
        "us.ca.cslb.contractors",
        "--file",
        californiaFixture,
        "--out",
        csvPath,
        "--format",
        "csv",
      ]);
      const csv = readFileSync(csvPath, "utf8");
      expect(csv).toContain("1234567");
      expect(csv).toContain(",active,");
      expect(csv).not.toContain("Personnel Title");
      expect(csv.trim().split("\n")).toHaveLength(7);
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
      expect(json.adapterMaturity).toBe("network_opt_in");
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

  it("syncs Minnesota DLI fixture data to JSONL and CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-minnesota-"));
    try {
      const jsonlPath = join(dir, "minnesota.jsonl");
      const jsonl = runCli([
        "sync",
        "us.mn.dli.licenses_registrations",
        "--file",
        minnesotaFixture,
        "--out",
        jsonlPath,
        "--json",
      ]);
      const json = JSON.parse(jsonl.stdout);
      expect(json.adapterMaturity).toBe("local_file_adapter");
      expect(json.stats.normalizedRecordCount).toBe(6);
      expect(json.stats.warningCount).toBeGreaterThan(0);
      const lines = readFileSync(jsonlPath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(6);
      expect(JSON.parse(lines[0]).license.tradeCategories).toEqual(["residential_contracting"]);

      const csvPath = join(dir, "minnesota.csv");
      runCli([
        "sync",
        "us.mn.dli.licenses_registrations",
        "--file",
        minnesotaFixture,
        "--out",
        csvPath,
        "--format",
        "csv",
      ]);
      const csv = readFileSync(csvPath, "utf8");
      expect(csv).toContain("BC000001");
      expect(csv).toContain(",active,");
      expect(csv).not.toContain("Discipline Indicator");
      expect(csv.trim().split("\n")).toHaveLength(7);
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
      expect(json.adapterMaturity).toBe("network_opt_in");
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

  it("syncs Arizona ROC fixture data to JSONL and CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-arizona-"));
    try {
      const jsonlPath = join(dir, "arizona.jsonl");
      const result = runCli(["sync", "us.az.roc.contractors", "--file", arizonaFixture, "--out", jsonlPath, "--json"]);
      const json = JSON.parse(result.stdout);
      expect(json.adapterMaturity).toBe("network_opt_in");
      expect(json.stats.normalizedRecordCount).toBe(6);
      expect(json.stats.warningCount).toBeGreaterThan(0);
      const lines = readFileSync(jsonlPath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(6);
      expect(JSON.parse(lines[0]).license.tradeCategories).toEqual(["general_contracting", "commercial_contracting"]);

      const csvPath = join(dir, "arizona.csv");
      runCli(["sync", "us.az.roc.contractors", "--file", arizonaFixture, "--out", csvPath, "--format", "csv"]);
      const csv = readFileSync(csvPath, "utf8");
      expect(csv).toContain("001001");
      expect(csv).toContain(",active,");
      expect(csv).not.toContain("Qualifying Party");
      expect(csv.trim().split("\n")).toHaveLength(7);
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
      expect(json.adapterMaturity).toBe("network_opt_in");
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
      expect(json.errors[0].message).toContain("Failed to normalize record 8");
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
      expect(strict.stderr).toContain("Failed to normalize record 8");
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
      expect(JSON.parse(readFileSync(outPath, "utf8").trim().split("\n")[0]).source.sourceUrl).toBe(server.url);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      await server.close();
    }
  });

  it("verifies from an explicit URL only when network access is opted in", async () => {
    const blocked = runCli(
      [
        "verify",
        "--source",
        "us.fl.dbpr.construction",
        "--url",
        "https://example.test/source.csv",
        "--license",
        "CGC012345",
      ],
      3,
      { allowStderr: true },
    );
    expect(blocked.stderr).toContain("Network verification requires --allow-network.");

    const undeclaredHost = runCli(
      [
        "verify",
        "--source",
        "us.fl.dbpr.construction",
        "--url",
        "https://example.test/source.csv",
        "--allow-network",
        "--license",
        "CGC012345",
      ],
      3,
      { allowStderr: true },
    );
    expect(undeclaredHost.stderr).toContain("host example.test is not declared");

    const fixture = readFileSync(sampleFixture, "utf8");
    const server = await startFixtureServer(fixture);
    try {
      const matched = await runCliAsync([
        "verify",
        "--source",
        "us.fl.dbpr.construction",
        "--url",
        server.url,
        "--allow-network",
        "--license",
        "CGC012345",
        "--json",
      ]);
      const json = JSON.parse(matched.stdout);
      expect(json.result).toBe("matched");
      expect(json.matchedRecord.schemaVersion).toBe("1.0");
      expect(json.matchedRecord.license.licenseNumber).toBe("CGC012345");
      expect(json.matchedRecord.source.sourceUrl).toBe(server.url);
      expect(json.matchedRecord.source.sourceLastModifiedAt).toBe("2026-01-01T00:00:00.000Z");
    } finally {
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

  it("verifies Arizona ROC matched, not-found, ambiguous, and invalid license cases", () => {
    const matched = runCli(["verify", "--source", "us.az.roc.contractors", "--file", arizonaFixture, "--license", "001001", "--json"]);
    expect(JSON.parse(matched.stdout).result).toBe("matched");

    const notFound = runCli(["verify", "--source", "us.az.roc.contractors", "--file", arizonaFixture, "--license", "AZROC999999"], 4);
    expect(notFound.stdout).toContain("not_found");

    const ambiguous = runCli(["verify", "--source", "us.az.roc.contractors", "--file", arizonaFixture, "--license", "009999"], 5);
    expect(ambiguous.stdout).toContain("ambiguous");

    const invalid = runCli(["verify", "--source", "us.az.roc.contractors", "--file", arizonaFixture, "--license", "!!!"], 2);
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

  it("continues local verification when unrelated rows fail normalization", () => {
    const dir = mkdtempSync(join(tmpdir(), "opentrade-verify-row-errors-"));
    try {
      const fixturePath = join(dir, "washington-with-bad-row.csv");
      const fixture = readFileSync(washingtonFixture, "utf8");
      const badRow =
        'MISSING LICENSE,,CC,Construction Contractor,999 ERROR RD,,SEATTLE,WA,98101,2065550199,01/01/2020,12/31/2099,LLC,Limited Liability Company,GEN,General Contractor,,,604009999,"ERROR, CASEY",A,ACTIVE,';
      writeFileSync(fixturePath, `${fixture.trim()}\n${badRow}\n`, "utf8");

      const matched = runCli([
        "verify",
        "--source",
        "us.wa.lni.contractors",
        "--file",
        fixturePath,
        "--license",
        "RAINCCB001JQ",
        "--json",
      ]);
      const json = JSON.parse(matched.stdout);
      expect(json.result).toBe("matched_with_warnings");
      expect(json.matchedRecord.license.licenseNumber).toBe("RAINCCB001JQ");
      expect(json.warnings).toContainEqual(
        expect.objectContaining({
          code: "record_normalization_failed",
          rowNumber: 8,
        }),
      );

      const human = runCli(["verify", "--source", "us.wa.lni.contractors", "--file", fixturePath, "--license", "RAINCCB001JQ"]).stdout;
      expect(human).toContain("matched_with_warnings");
      expect(human).toContain("warnings:");
      expect(human).toContain("record_normalization_failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
  const result = spawnSync(process.execPath, [tsxPath, cliPath, "--", ...args], {
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
    const child = spawn(process.execPath, [tsxPath, cliPath, "--", ...args], {
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
