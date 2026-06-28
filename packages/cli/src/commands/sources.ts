import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  buildSourceReadiness,
  filterSources,
  getSourceResearchNextAction,
  getSourceResearchOutcome,
  sourceRegistryEntrySchema,
  type SourceFilterOptions,
  type SourceRegistryEntry,
} from "@opentrade-registry/core";

type CoverageStatus =
  | "not_started"
  | "source_identified"
  | "registry_entry_added"
  | "adapter_planned"
  | "fixture_supported"
  | "local_file_supported"
  | "network_opt_in_supported"
  | "production_ready_supported"
  | "blocked"
  | "deprecated";

type CoverageRow = {
  state?: string;
  territory?: string;
  name?: string;
  status: CoverageStatus;
  sourceIds: string[];
  notes: string;
};

type CoverageSummary = {
  stateCount: number;
  researchedStateCount: number;
  territoryCount: number;
  researchedTerritoryCount: number;
  stateCoverageByStatus: Record<string, number>;
  territoryCoverageByStatus: Record<string, number>;
  states: CoverageRow[];
  territories: CoverageRow[];
};

export type SourceListOptions = SourceFilterOptions & {
  json?: boolean;
};

export async function loadSourceRegistry(rootDir: string): Promise<SourceRegistryEntry[]> {
  const sourceRoot = join(rootDir, "registry", "sources");
  const files = await listJsonFiles(sourceRoot);
  const entries: SourceRegistryEntry[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    entries.push(sourceRegistryEntrySchema.parse(JSON.parse(content)));
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listSources(rootDir: string, options: SourceListOptions) {
  const entries = filterSources(await loadSourceRegistry(rootDir), options);
  if (options.json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log("No source registry entries matched the requested filters.");
    return;
  }

  for (const entry of entries) {
    console.log(
      `${entry.id}\t${entry.adapterStatus}\t${entry.adapterMaturity}\tlevel_${entry.adapterQualityLevel ?? 0}\t${getSourceResearchOutcome(entry)}\t${entry.name}`,
    );
  }
}

export async function showSourceCoverage(rootDir: string, options: { json?: boolean }) {
  const summary = await loadCoverageSummary(rootDir);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log("OpenTrade source coverage");
  console.log(`states and DC: ${summary.researchedStateCount}/${summary.stateCount} researched`);
  console.log(`major territories: ${summary.researchedTerritoryCount}/${summary.territoryCount} researched`);
  printCounts("state coverage by status", summary.stateCoverageByStatus);
  printCounts("territory coverage by status", summary.territoryCoverageByStatus);
  console.log("implemented state rows:");
  for (const row of summary.states.filter((entry) => ["local_file_supported", "network_opt_in_supported", "production_ready_supported"].includes(entry.status))) {
    console.log(`- ${row.state}: ${row.status} (${row.sourceIds.join(", ")})`);
  }
  console.log("Coverage rows are source-discovery metadata, not proof of complete statewide licensing coverage.");
}

export async function showSourceReadiness(rootDir: string, options: { json?: boolean }) {
  const entries = await loadSourceRegistry(rootDir);
  const payload = buildSourceReadiness(entries);

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log("OpenTrade source readiness");
  console.log(`sources: ${payload.sourceCount}`);
  console.log(`terminal source decisions: ${payload.terminalSourceCount}`);
  console.log(`blocked sources: ${payload.blockedSourceCount}`);
  console.log(`implemented adapter sources: ${payload.implementedAdapterSources.length}`);
  for (const source of payload.implementedAdapterSources) {
    console.log(`- ${source.id} (${source.sourceType}, ${source.adapterMaturity}, level_${source.adapterQualityLevel})`);
  }
  console.log(`unimplemented bulk-shaped candidates: ${payload.unimplementedBulkAdapterCandidates.length}`);
  for (const source of payload.unimplementedBulkAdapterCandidates) {
    console.log(`- ${source.id} (${source.sourceType}, ${source.coverageScope})`);
  }
  console.log("research outcomes:");
  for (const [outcome, count] of Object.entries(payload.sourcesByResearchOutcome).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`- ${outcome}: ${count}`);
  }
  console.log(`download/export research candidates: ${payload.downloadResearchCandidates.length}`);
  for (const source of payload.downloadResearchCandidates) {
    console.log(`- ${source.id} (${source.sourceType}, ${source.coverageScope})`);
  }
  console.log(`lookup automation constraint sources: ${payload.lookupAutomationConstraintSources.length}`);
  for (const source of payload.lookupAutomationConstraintSources) {
    console.log(`- ${source.id} (${source.sourceType}, ${source.coverageScope})`);
  }
  console.log(`registry-only sources: ${payload.registryOnlySourceCount}`);
  console.log(payload.note);
}

export async function showSource(rootDir: string, sourceId: string, options: { json?: boolean }) {
  const entries = await loadSourceRegistry(rootDir);
  const entry = entries.find((candidate) => candidate.id === sourceId);
  if (!entry) {
    throw Object.assign(new Error(`Unknown source: ${sourceId}`), { exitCode: 2 });
  }

  if (options.json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  console.log(`${entry.name}`);
  console.log(`id: ${entry.id}`);
  console.log(`agency: ${entry.agency.name}`);
  console.log(`type: ${entry.sourceType}`);
  console.log(`url: ${entry.sourceUrl}`);
  if (entry.officialLookupUrl) {
    console.log(`lookup: ${entry.officialLookupUrl}`);
  }
  console.log(`status: ${entry.adapterStatus}`);
  console.log(`maturity: ${entry.adapterMaturity}`);
  console.log(`quality level: ${entry.adapterQualityLevel ?? 0}`);
  console.log(`coverage: ${entry.coverageScope}`);
  console.log(`discovery: ${entry.sourceDiscoveryStatus}`);
  console.log(`research outcome: ${getSourceResearchOutcome(entry)}`);
  console.log(`next action: ${getSourceResearchNextAction(entry)}`);
  console.log(`redistribution: ${entry.redistributionStatus}`);
  if (entry.testFixturePath) {
    console.log(`fixture: ${entry.testFixturePath}`);
  }
  if (entry.officialBulkDownloadNotes) {
    console.log(`bulk notes: ${entry.officialBulkDownloadNotes}`);
  }
  if (entry.verificationReviewedAt) {
    console.log(`verification reviewed: ${entry.verificationReviewedAt}`);
  }
  if (entry.verificationCaveats && entry.verificationCaveats.length > 0) {
    console.log("verification caveats:");
    for (const caveat of entry.verificationCaveats) {
      console.log(`- ${caveat}`);
    }
  }
  if (entry.verificationNotes) {
    console.log(`verification notes: ${entry.verificationNotes}`);
  }
  if (entry.knownExclusions.length > 0) {
    console.log("known exclusions:");
    for (const exclusion of entry.knownExclusions) {
      console.log(`- ${exclusion}`);
    }
  }
  if (entry.publicRecordsNotes) {
    console.log(`public records: ${entry.publicRecordsNotes}`);
  }
  if (entry.researchNotes) {
    console.log(`research: ${entry.researchNotes}`);
  }
}

async function loadCoverageSummary(rootDir: string): Promise<CoverageSummary> {
  const stateCoverage = JSON.parse(await readFile(join(rootDir, "registry", "us-coverage.json"), "utf8")) as { states: CoverageRow[] };
  const territoryCoverage = JSON.parse(await readFile(join(rootDir, "registry", "us-territory-coverage.json"), "utf8")) as {
    territories: CoverageRow[];
  };

  return {
    stateCount: stateCoverage.states.length,
    researchedStateCount: stateCoverage.states.filter((state) => state.sourceIds.length > 0).length,
    territoryCount: territoryCoverage.territories.length,
    researchedTerritoryCount: territoryCoverage.territories.filter((territory) => territory.sourceIds.length > 0).length,
    stateCoverageByStatus: countBy(stateCoverage.states, (state) => state.status),
    territoryCoverageByStatus: countBy(territoryCoverage.territories, (territory) => territory.status),
    states: stateCoverage.states,
    territories: territoryCoverage.territories,
  };
}

function countBy<T>(values: T[], getKey: (value: T) => string): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = getKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function printCounts(title: string, counts: Record<string, number>) {
  console.log(`${title}:`);
  for (const [key, value] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`- ${key}: ${value}`);
  }
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
