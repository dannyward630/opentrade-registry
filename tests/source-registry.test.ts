import { access, readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceRegistryEntrySchema, sourceRegistryEntryV1Schema } from "@opentrade-registry/core";
import { listImplementedSourceIds } from "../packages/cli/src/adapters.js";

const coverageStatuses = [
  "not_started",
  "source_identified",
  "registry_entry_added",
  "adapter_planned",
  "fixture_supported",
  "local_file_supported",
  "network_opt_in_supported",
  "production_ready_supported",
  "blocked",
  "deprecated",
] as const;

type CoverageStatus = (typeof coverageStatuses)[number];

type UsCoverageIndex = {
  country: "US";
  coverageStatuses: CoverageStatus[];
  states: {
    state: string;
    status: CoverageStatus;
    sourceIds: string[];
    notes: string;
  }[];
};

type UsTerritoryCoverageIndex = {
  country: "US";
  coverageStatuses: CoverageStatus[];
  territories: {
    territory: string;
    name: string;
    status: CoverageStatus;
    sourceIds: string[];
    notes: string;
  }[];
};

describe("source registry", () => {
  it("validates every source registry entry", async () => {
    const files = await listJsonFiles(join(process.cwd(), "registry", "sources"));
    expect(files.length).toBeGreaterThanOrEqual(68);

    const parsed = [];
    for (const file of files) {
      parsed.push(sourceRegistryEntryV1Schema.parse(JSON.parse(await readFile(file, "utf8"))));
    }

    expect(parsed.map((entry) => entry.id).sort()).toEqual([
      "us.ak.commerce.construction_contractors",
      "us.ak.commerce.electrical_administrators",
      "us.ak.commerce.mechanical_administrators",
      "us.al.aecb.electrical_contractors",
      "us.al.genconbd.general_contractors",
      "us.al.hacr.contractors",
      "us.al.hblb.home_builders",
      "us.al.pgfb.plumbers_gas_fitters",
      "us.ar.aclb.contractors",
      "us.as.doc.business_licenses",
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.co.cdphe.asbestos_contractors",
      "us.co.dora.trades",
      "us.ct.dcp.home_improvement_contractors",
      "us.dc.dlcp.contractors",
      "us.de.labor.construction_contractors",
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
      "us.ga.sos.residential_general_contractors",
      "us.gu.clb.contractors",
      "us.hi.dcca.contractors",
      "us.ia.dial.contractor_registration",
      "us.id.dopl.contractors",
      "us.il.idfpr.roofing_contractors",
      "us.in.pla.professional_licenses",
      "us.ks.ag.roofing_registration",
      "us.ky.dhbc.trades",
      "us.la.lslbc.contractors",
      "us.ma.dol.opsi_construction_supervisors",
      "us.md.dllr.home_improvement_contractors",
      "us.me.pfr.professional_licenses",
      "us.mi.lara.residential_builders",
      "us.mn.dli.licenses_registrations",
      "us.mo.pr.professional_licenses",
      "us.mp.bpl.professional_licenses",
      "us.ms.msboc.contractors",
      "us.mt.dli.contractor_registration",
      "us.nc.ncbeec.electrical_contractors",
      "us.nc.nclbgc.general_contractors",
      "us.nc.nclicensing.plumbing_heating_fire_sprinkler",
      "us.nd.sos.contractors",
      "us.ne.dol.contractor_registration",
      "us.nh.oplc.trades",
      "us.nj.dca.home_improvement_contractors",
      "us.nm.rld.construction_industries",
      "us.nv.nscb.contractors",
      "us.ny.dos.licensee_search",
      "us.oh.commerce.ocilb_contractors",
      "us.ok.cib.trades",
      "us.or.ccb.active_licenses",
      "us.pa.oag.home_improvement_contractors",
      "us.pr.daco.contractors",
      "us.ri.crlb.contractors",
      "us.sc.llr.contractors",
      "us.sd.dlr.plumbing",
      "us.tn.commerce.contractors",
      "us.tx.tdlr.all_licenses",
      "us.tx.tsbpe.plumbing",
      "us.ut.dopl.contractors",
      "us.va.dpor.contractors",
      "us.vi.dlca.contractors_trades",
      "us.vt.sos.residential_contractors",
      "us.wa.lni.contractors",
      "us.wi.dsps.dwelling_trades",
      "us.wv.labor.contractors",
      "us.wy.firemarshal.electrical",
    ]);
    expect(parsed.every((entry) => entry.redistributionStatus === "unknown")).toBe(true);
    expect(parsed.filter((entry) => entry.sourceDiscoveryStatus === "researched")).toHaveLength(9);
    expect(parsed.filter((entry) => entry.sourceDiscoveryStatus === "blocked")).toHaveLength(59);
    expect(parsed.filter((entry) => entry.adapterMaturity === "network_opt_in")).toHaveLength(7);
    expect(parsed.filter((entry) => entry.adapterMaturity === "local_file_adapter")).toHaveLength(2);
    expect(parsed.filter((entry) => entry.adapterMaturity === "blocked")).toHaveLength(59);
    for (const implemented of parsed.filter((entry) => entry.adapterStatus === "implemented")) {
      expect(implemented.adapterQualityLevel, `${implemented.id} should have Level 4 verification quality`).toBe(4);
      expect(implemented.verificationReviewedAt, `${implemented.id} needs a verification review timestamp`).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(implemented.verificationCaveats?.length, `${implemented.id} needs verification caveats`).toBeGreaterThanOrEqual(2);
      expect(implemented.verificationNotes?.length, `${implemented.id} needs verification notes`).toBeGreaterThan(0);
    }
    expect(parsed.every((entry) => entry.schemaVersion === "1.0")).toBe(true);
    expect(parsed.every((entry) => entry.researchEvidence.length > 0 && entry.nextReviewAt.length > 0)).toBe(true);
    expect(parsed.filter((entry) => entry.sourceResearchOutcome === "blocked").every((entry) => entry.blocker)).toBe(true);
  });

  it("enforces source registry consistency rules", async () => {
    const sourceFiles = await listJsonFiles(join(process.cwd(), "registry", "sources"));
    const parsed = await Promise.all(
      sourceFiles.map(async (file) => ({
        file,
        entry: sourceRegistryEntryV1Schema.parse(JSON.parse(await readFile(file, "utf8"))),
      })),
    );
    const sourceIds = parsed.map(({ entry }) => entry.id);
    const sourceUrls = parsed.map(({ entry }) => entry.sourceUrl);
    const implementedSourceIds = listImplementedSourceIds();
    const registryRoot = join(process.cwd(), "registry", "sources");

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(new Set(sourceUrls).size).toBe(sourceUrls.length);

    for (const { file, entry } of parsed) {
      const state = entry.jurisdiction.state.toLowerCase();
      const relativeParts = relative(registryRoot, file).split(/[\\/]/);

      expect(relativeParts[0], `${entry.id} should be under registry/sources/us`).toBe("us");
      expect(relativeParts[1], `${entry.id} should be stored under its two-letter state directory`).toBe(state);
      expect(entry.id.startsWith(`us.${state}.`), `${entry.id} should include its jurisdiction state`).toBe(true);
      if (entry.adapterPackage) {
        expect(entry.adapterPackage.startsWith(`@opentrade-registry/adapter-${state}-`), `${entry.id} has an adapter package that does not include its state code`).toBe(true);
      }

      if (!entry.termsUrl) {
        expect(entry.termsReviewNotes, `${entry.id} has no termsUrl and needs termsReviewNotes`).toBeTruthy();
      }

      if (!entry.officialLookupUrl) {
        expect(entry.officialLookupReviewNotes, `${entry.id} has no officialLookupUrl and needs officialLookupReviewNotes`).toBeTruthy();
      }

      if (entry.adapterStatus === "implemented") {
        expect(implementedSourceIds, `${entry.id} is implemented but not registered in the CLI adapter registry`).toContain(entry.id);
      }

      if (
        entry.adapterMaturity === "fixture_adapter" ||
        entry.adapterMaturity === "local_file_adapter" ||
        entry.adapterMaturity === "network_opt_in" ||
        entry.adapterMaturity === "production_ready"
      ) {
        expect(entry.testFixturePath, `${entry.id} needs a testFixturePath for maturity ${entry.adapterMaturity}`).toBeTruthy();
        await expect(access(join(process.cwd(), entry.testFixturePath!))).resolves.toBeUndefined();
      }
    }
  });

  it("validates US coverage index and source references", async () => {
    const coverage = JSON.parse(await readFile(join(process.cwd(), "registry", "us-coverage.json"), "utf8")) as UsCoverageIndex;
    const territoryCoverage = JSON.parse(
      await readFile(join(process.cwd(), "registry", "us-territory-coverage.json"), "utf8"),
    ) as UsTerritoryCoverageIndex;
    const sourceFiles = await listJsonFiles(join(process.cwd(), "registry", "sources"));
    const sources = await Promise.all(
      sourceFiles.map(async (file) => sourceRegistryEntrySchema.parse(JSON.parse(await readFile(file, "utf8")))),
    );
    const sourceIds = new Set(sources.map((entry) => entry.id));
    const sourcesById = new Map(sources.map((entry) => [entry.id, entry]));
    const coverageStatesBySourceId = new Map(
      coverage.states.flatMap((state) => state.sourceIds.map((sourceId) => [sourceId, state.state] as const)),
    );
    const coverageTerritoriesBySourceId = new Map(
      territoryCoverage.territories.flatMap((territory) => territory.sourceIds.map((sourceId) => [sourceId, territory.territory] as const)),
    );
    const expectedStates = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "DC",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
    ];
    const expectedTerritories = ["AS", "GU", "MP", "PR", "VI"];

    expect(coverage.country).toBe("US");
    expect(coverage.states.map((entry) => entry.state)).toEqual(expectedStates);
    expect(new Set(coverage.states.map((entry) => entry.state)).size).toBe(51);
    expect(coverage.coverageStatuses).toEqual(coverageStatuses);
    expect(territoryCoverage.country).toBe("US");
    expect(territoryCoverage.territories.map((entry) => entry.territory)).toEqual(expectedTerritories);
    expect(new Set(territoryCoverage.territories.map((entry) => entry.territory)).size).toBe(5);
    expect(territoryCoverage.coverageStatuses).toEqual(coverageStatuses);
    for (const state of coverage.states) {
      expect(coverageStatuses).toContain(state.status);
      expect(state.notes.length).toBeGreaterThan(0);
      for (const sourceId of state.sourceIds) {
        expect(sourceIds.has(sourceId), `${state.state} references unknown source ${sourceId}`).toBe(true);
        expect(sourcesById.get(sourceId)?.jurisdiction.state, `${sourceId} has mismatched coverage state`).toBe(state.state);
      }
    }
    for (const territory of territoryCoverage.territories) {
      expect(coverageStatuses).toContain(territory.status);
      expect(territory.name.length).toBeGreaterThan(0);
      expect(territory.notes.length).toBeGreaterThan(0);
      for (const sourceId of territory.sourceIds) {
        expect(sourceIds.has(sourceId), `${territory.territory} references unknown source ${sourceId}`).toBe(true);
        expect(sourcesById.get(sourceId)?.jurisdiction.state, `${sourceId} has mismatched territory coverage`).toBe(territory.territory);
      }
    }
    for (const source of sources) {
      const coverageCode = coverageStatesBySourceId.get(source.id) ?? coverageTerritoriesBySourceId.get(source.id);
      expect(coverageCode, `${source.id} is missing from US coverage`).toBe(source.jurisdiction.state);
    }
    expect(coverage.states.filter((entry) => entry.status === "blocked")).toHaveLength(45);
    expect(coverage.states.filter((entry) => entry.status === "local_file_supported")).toHaveLength(2);
    expect(coverage.states.filter((entry) => entry.status === "network_opt_in_supported")).toHaveLength(4);
    expect(coverage.states.find((entry) => entry.state === "AZ")?.status).toBe("network_opt_in_supported");
    expect(coverage.states.find((entry) => entry.state === "FL")?.status).toBe("network_opt_in_supported");
    expect(coverage.states.find((entry) => entry.state === "AK")?.status).toBe("blocked");
    for (const territory of expectedTerritories) {
      expect(territoryCoverage.territories.find((entry) => entry.territory === territory)?.status).toBe("blocked");
    }
  });
});

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}
