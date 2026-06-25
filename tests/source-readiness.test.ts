import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSourceReadiness,
  isBulkShapedCandidate,
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
      "us.fl.dbpr.construction",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(readiness.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual([
      "us.ak.commerce.construction_contractors",
      "us.ca.cslb.contractors",
      "us.il.idfpr.roofing_contractors",
      "us.in.pla.professional_licenses",
    ]);
    expect(readiness.registryOnlySourceCount).toBe(51);
    expect(readiness.note).toContain("planning signal only");
  });

  it("classifies sources as bulk-shaped adapter candidates conservatively", async () => {
    const sources = await loadRegistrySources();
    const byId = new Map(sources.map((source) => [source.id, source]));

    expect(isBulkShapedCandidate(requiredSource(byId, "us.ca.cslb.contractors"))).toBe(true);
    expect(isBulkShapedCandidate(requiredSource(byId, "us.nv.nscb.contractors"))).toBe(false);
  });

  it("excludes blocked and deprecated sources from unimplemented bulk adapter candidates", async () => {
    const sources = await loadRegistrySources();
    const california = requiredSource(new Map(sources.map((source) => [source.id, source])), "us.ca.cslb.contractors");
    const blocked = { ...california, id: "test.blocked.bulk", adapterStatus: "blocked" as const, adapterMaturity: "blocked" as const };
    const deprecated = { ...california, id: "test.deprecated.bulk", adapterStatus: "deprecated" as const, adapterMaturity: "deprecated" as const };

    expect(isUnimplementedBulkAdapterCandidate(california)).toBe(true);
    expect(isUnimplementedBulkAdapterCandidate(blocked)).toBe(false);
    expect(isUnimplementedBulkAdapterCandidate(deprecated)).toBe(false);

    const readiness = buildSourceReadiness([california, blocked, deprecated]);
    expect(readiness.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual(["us.ca.cslb.contractors"]);
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
