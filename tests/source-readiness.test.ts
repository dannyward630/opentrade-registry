import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSourceReadiness,
  getSourceResearchNextAction,
  getSourceResearchOutcome,
  hasLookupAutomationConstraint,
  isBulkShapedCandidate,
  isDownloadResearchCandidate,
  isUnimplementedBulkAdapterCandidate,
  sourceRegistryEntrySchema,
  type SourceRegistryEntry,
} from "@opentrade/core";

describe("source readiness helpers", () => {
  it("summarizes implemented sources and unimplemented bulk-shaped candidates", async () => {
    const sources = await loadRegistrySources();
    const readiness = buildSourceReadiness(sources);

    expect(readiness.sourceCount).toBe(56);
    expect(readiness.implementedAdapterSources.map((source) => source.id)).toEqual([
      "us.ak.commerce.construction_contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.construction",
      "us.il.idfpr.roofing_contractors",
      "us.in.pla.professional_licenses",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(readiness.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual([]);
    expect(readiness.downloadResearchCandidates.map((source) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ct.dcp.home_improvement_contractors",
      "us.ma.dol.opsi_construction_supervisors",
      "us.oh.commerce.ocilb_contractors",
      "us.pa.oag.home_improvement_contractors",
      "us.pr.daco.contractors",
      "us.ri.crlb.contractors",
      "us.wv.labor.contractors",
    ]);
    expect(readiness.lookupAutomationConstraintSources.map((source) => source.id)).toEqual([
      "us.ks.ag.roofing_registration",
      "us.mi.lara.residential_builders",
      "us.mo.pr.professional_licenses",
      "us.nd.sos.contractors",
      "us.oh.commerce.ocilb_contractors",
      "us.pa.oag.home_improvement_contractors",
      "us.vi.dlca.contractors_trades",
      "us.vt.sos.residential_contractors",
      "us.wi.dsps.dwelling_trades",
    ]);
    expect(readiness.sourcesByResearchOutcome).toEqual({
      adapter_candidate: 8,
      blocked_by_access_controls: 1,
      blocked_by_no_stable_source: 1,
      blocked_by_terms: 2,
      implemented_adapter: 9,
      needs_manual_research: 27,
      not_contractor_specific: 8,
    });
    expect(readiness.registryOnlySourceCount).toBe(47);
    expect(readiness.note).toContain("planning signal only");
  });

  it("classifies sources as bulk-shaped adapter candidates conservatively", async () => {
    const sources = await loadRegistrySources();
    const byId = new Map(sources.map((source) => [source.id, source]));

    expect(isBulkShapedCandidate(requiredSource(byId, "us.ca.cslb.contractors"))).toBe(true);
    expect(isBulkShapedCandidate(requiredSource(byId, "us.nv.nscb.contractors"))).toBe(false);
    expect(isDownloadResearchCandidate(requiredSource(byId, "us.pa.oag.home_improvement_contractors"))).toBe(true);
    expect(isDownloadResearchCandidate(requiredSource(byId, "us.nv.nscb.contractors"))).toBe(false);
    expect(hasLookupAutomationConstraint(requiredSource(byId, "us.vt.sos.residential_contractors"))).toBe(true);
    expect(hasLookupAutomationConstraint(requiredSource(byId, "us.tx.tdlr.all_licenses"))).toBe(false);
  });

  it("assigns conservative research outcomes and next actions", async () => {
    const sources = await loadRegistrySources();
    const byId = new Map(sources.map((source) => [source.id, source]));

    expect(getSourceResearchOutcome(requiredSource(byId, "us.fl.dbpr.construction"))).toBe("implemented_adapter");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.pa.oag.home_improvement_contractors"))).toBe("adapter_candidate");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.vt.sos.residential_contractors"))).toBe("blocked_by_access_controls");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.as.doc.business_licenses"))).toBe("blocked_by_no_stable_source");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.ms.msboc.contractors"))).toBe("blocked_by_terms");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.mp.bpl.professional_licenses"))).toBe("not_contractor_specific");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.al.genconbd.general_contractors"))).toBe("needs_manual_research");
    expect(getSourceResearchNextAction(requiredSource(byId, "us.pa.oag.home_improvement_contractors"))).toContain("Review official terms");
  });

  it("excludes blocked and deprecated sources from unimplemented bulk adapter candidates", async () => {
    const sources = await loadRegistrySources();
    const florida = requiredSource(new Map(sources.map((source) => [source.id, source])), "us.fl.dbpr.construction");
    const syntheticCandidate = { ...florida, id: "test.planned.bulk", adapterStatus: "planned" as const, adapterMaturity: "registry_only" as const };
    const blocked = { ...syntheticCandidate, id: "test.blocked.bulk", adapterStatus: "blocked" as const, adapterMaturity: "blocked" as const };
    const deprecated = { ...syntheticCandidate, id: "test.deprecated.bulk", adapterStatus: "deprecated" as const, adapterMaturity: "deprecated" as const };

    expect(isUnimplementedBulkAdapterCandidate(syntheticCandidate)).toBe(true);
    expect(isUnimplementedBulkAdapterCandidate(blocked)).toBe(false);
    expect(isUnimplementedBulkAdapterCandidate(deprecated)).toBe(false);

    const readiness = buildSourceReadiness([syntheticCandidate, blocked, deprecated]);
    expect(readiness.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual(["test.planned.bulk"]);
  });
});

async function loadRegistrySources(): Promise<SourceRegistryEntry[]> {
  const sourceRoot = join(process.cwd(), "registry", "sources");
  const files = await listJsonFiles(sourceRoot);
  const sources = [];

  for (const file of files) {
    sources.push(sourceRegistryEntrySchema.parse(JSON.parse(await readFile(file, "utf8"))));
  }

  return sources.sort((a, b) => a.id.localeCompare(b.id));
}

function requiredSource(sources: Map<string, SourceRegistryEntry>, id: string): SourceRegistryEntry {
  const source = sources.get(id);
  if (!source) {
    throw new Error(`Missing fixture source ${id}`);
  }

  return source;
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}
