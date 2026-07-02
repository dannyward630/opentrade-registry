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
} from "@opentrade-registry/core";

describe("source readiness helpers", () => {
  it("summarizes implemented sources and unimplemented bulk-shaped candidates", async () => {
    const sources = await loadRegistrySources();
    const readiness = buildSourceReadiness(sources);

    expect(readiness.sourceCount).toBe(77);
    expect(readiness.implementedAdapterSources.map((source) => source.id)).toEqual([
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
    expect(readiness.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual([]);
    expect(readiness.downloadResearchCandidates).toEqual([]);
    expect(readiness.lookupAutomationConstraintSources).toEqual([]);
    expect(readiness.sourcesByResearchOutcome).toEqual({
      blocked: 68,
      deprecated: 0,
      local_file_adapter: 2,
      network_opt_in: 7,
      production_ready: 0,
    });
    expect(readiness.registryOnlySourceCount).toBe(0);
    expect(readiness.blockedSourceCount).toBe(68);
    expect(readiness.terminalSourceCount).toBe(77);
    expect(readiness.note).toContain("terminal");
  });

  it("classifies sources as bulk-shaped adapter candidates conservatively", async () => {
    const sources = await loadRegistrySources();
    const byId = new Map(sources.map((source) => [source.id, source]));

    expect(isBulkShapedCandidate(requiredSource(byId, "us.ca.cslb.contractors"))).toBe(true);
    expect(isBulkShapedCandidate(requiredSource(byId, "us.nv.nscb.contractors"))).toBe(false);
    expect(isDownloadResearchCandidate(requiredSource(byId, "us.pa.oag.home_improvement_contractors"))).toBe(false);
    expect(isDownloadResearchCandidate(requiredSource(byId, "us.nv.nscb.contractors"))).toBe(false);
    expect(hasLookupAutomationConstraint(requiredSource(byId, "us.vt.sos.residential_contractors"))).toBe(true);
    expect(hasLookupAutomationConstraint(requiredSource(byId, "us.tx.tdlr.all_licenses"))).toBe(false);
  });

  it("assigns conservative research outcomes and next actions", async () => {
    const sources = await loadRegistrySources();
    const byId = new Map(sources.map((source) => [source.id, source]));

    expect(getSourceResearchOutcome(requiredSource(byId, "us.fl.dbpr.construction"))).toBe("network_opt_in");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.pa.oag.home_improvement_contractors"))).toBe("blocked");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.vt.sos.residential_contractors"))).toBe("blocked");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.as.doc.business_licenses"))).toBe("blocked");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.ms.msboc.contractors"))).toBe("blocked");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.mp.bpl.professional_licenses"))).toBe("blocked");
    expect(getSourceResearchOutcome(requiredSource(byId, "us.al.genconbd.general_contractors"))).toBe("blocked");
    expect(getSourceResearchNextAction(requiredSource(byId, "us.pa.oag.home_improvement_contractors"))).toContain("protected interactive access");
  });

  it("excludes blocked and deprecated sources from unimplemented bulk adapter candidates", async () => {
    const sources = await loadRegistrySources();
    const florida = requiredSource(new Map(sources.map((source) => [source.id, source])), "us.fl.dbpr.construction");
    const syntheticCandidate = {
      ...florida,
      id: "test.planned.bulk",
      adapterStatus: "planned" as const,
      adapterMaturity: "registry_only" as const,
      sourceResearchOutcome: undefined,
    };
    const blocked = { ...syntheticCandidate, id: "test.blocked.bulk", adapterStatus: "blocked" as const, adapterMaturity: "blocked" as const, sourceResearchOutcome: "blocked" as const };
    const deprecated = { ...syntheticCandidate, id: "test.deprecated.bulk", adapterStatus: "deprecated" as const, adapterMaturity: "deprecated" as const, sourceResearchOutcome: "deprecated" as const };

    expect(isUnimplementedBulkAdapterCandidate(syntheticCandidate)).toBe(false);
    expect(isUnimplementedBulkAdapterCandidate(blocked)).toBe(false);
    expect(isUnimplementedBulkAdapterCandidate(deprecated)).toBe(false);

    expect(() => buildSourceReadiness([syntheticCandidate, blocked, deprecated])).toThrow("no terminal v1 research outcome");
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
