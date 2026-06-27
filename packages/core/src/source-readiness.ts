import type { SourceRegistryEntry, SourceResearchOutcome } from "./schema/source-registry.js";

export const SOURCE_READINESS_NOTE =
  "Every v1 source has a terminal implementation or blocker outcome. Blocked does not mean records are unavailable to people; it means automated ingestion is not presently defensible.";

export const SOURCE_RESEARCH_OUTCOMES = ["production_ready", "network_opt_in", "local_file_adapter", "blocked", "deprecated"] as const;

export type SourceReadinessSummary = {
  id: string;
  name: string;
  state: string;
  sourceType: SourceRegistryEntry["sourceType"];
  adapterStatus: SourceRegistryEntry["adapterStatus"];
  adapterMaturity: SourceRegistryEntry["adapterMaturity"];
  adapterQualityLevel: number;
  coverageScope: SourceRegistryEntry["coverageScope"];
  hasBulkDownload: SourceRegistryEntry["hasBulkDownload"];
  sourceResearchOutcome: SourceResearchOutcome;
  nextAction: string;
  blockerCode?: string;
};

export type SourceReadiness = {
  sourceCount: number;
  terminalSourceCount: number;
  blockedSourceCount: number;
  implementedAdapterSources: SourceReadinessSummary[];
  blockedSources: SourceReadinessSummary[];
  unimplementedBulkAdapterCandidates: SourceReadinessSummary[];
  downloadResearchCandidates: SourceReadinessSummary[];
  lookupAutomationConstraintSources: SourceReadinessSummary[];
  sourcesByResearchOutcome: Record<SourceResearchOutcome, number>;
  registryOnlySourceCount: number;
  note: string;
};

export function buildSourceReadiness(sources: SourceRegistryEntry[]): SourceReadiness {
  const summaries = sources.map(toSourceReadinessSummary);
  const blockedSources = summaries.filter((source) => source.sourceResearchOutcome === "blocked");

  return {
    sourceCount: sources.length,
    terminalSourceCount: summaries.length,
    blockedSourceCount: blockedSources.length,
    implementedAdapterSources: summaries.filter((source) => source.adapterStatus === "implemented"),
    blockedSources,
    unimplementedBulkAdapterCandidates: [],
    downloadResearchCandidates: [],
    lookupAutomationConstraintSources: [],
    sourcesByResearchOutcome: countSourcesByResearchOutcome(sources),
    registryOnlySourceCount: sources.filter((source) => source.adapterMaturity === "registry_only").length,
    note: SOURCE_READINESS_NOTE,
  };
}

export function isBulkShapedCandidate(source: SourceRegistryEntry): boolean {
  return source.hasBulkDownload === true || source.sourceType.startsWith("bulk_") || source.sourceType === "api";
}

export function isUnimplementedBulkAdapterCandidate(_source: SourceRegistryEntry): boolean {
  return false;
}

export function isDownloadResearchCandidate(_source: SourceRegistryEntry): boolean {
  return false;
}

export function hasLookupAutomationConstraint(source: SourceRegistryEntry): boolean {
  return source.sourceResearchOutcome === "blocked" && source.blocker?.code === "access_controls";
}

export function getSourceResearchOutcome(source: SourceRegistryEntry): SourceResearchOutcome {
  if (!source.sourceResearchOutcome) {
    throw new Error(`Source ${source.id} has no terminal v1 research outcome.`);
  }
  return source.sourceResearchOutcome;
}

export function getSourceResearchNextAction(source: SourceRegistryEntry): string {
  switch (getSourceResearchOutcome(source)) {
    case "production_ready":
      return "Maintain the production adapter, source canary, caveats, and scheduled evidence review.";
    case "network_opt_in":
      return "Maintain explicit network consent, remote provenance, offline tests, and scheduled evidence review.";
    case "local_file_adapter":
      return "Maintain official local-file compatibility, fixtures, caveats, and scheduled evidence review.";
    case "blocked":
      return source.blocker?.summary ?? "Review the documented blocker at the scheduled source review.";
    case "deprecated":
      return source.blocker?.summary ?? "Retain historical metadata and do not use this source for new verification.";
  }
}

export function toSourceReadinessSummary(source: SourceRegistryEntry): SourceReadinessSummary {
  return {
    id: source.id,
    name: source.name,
    state: source.jurisdiction.state,
    sourceType: source.sourceType,
    adapterStatus: source.adapterStatus,
    adapterMaturity: source.adapterMaturity,
    adapterQualityLevel: source.adapterQualityLevel ?? 0,
    coverageScope: source.coverageScope,
    hasBulkDownload: source.hasBulkDownload,
    sourceResearchOutcome: getSourceResearchOutcome(source),
    nextAction: getSourceResearchNextAction(source),
    blockerCode: source.blocker?.code,
  };
}

function countSourcesByResearchOutcome(sources: SourceRegistryEntry[]): Record<SourceResearchOutcome, number> {
  const counts = Object.fromEntries(SOURCE_RESEARCH_OUTCOMES.map((outcome) => [outcome, 0])) as Record<SourceResearchOutcome, number>;
  for (const source of sources) {
    counts[getSourceResearchOutcome(source)] += 1;
  }
  return counts;
}
