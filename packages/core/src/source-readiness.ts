import type { SourceRegistryEntry } from "./schema/source-registry.js";

export const SOURCE_READINESS_NOTE =
  "Candidate status is a planning signal only. Review source terms, fixture safety, field shape, filters, and verification caveats before implementation.";

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
  sourceResearchOutcome: SourceResearchPlanningOutcome;
  nextAction: string;
};

export type SourceReadiness = {
  sourceCount: number;
  implementedAdapterSources: SourceReadinessSummary[];
  unimplementedBulkAdapterCandidates: SourceReadinessSummary[];
  downloadResearchCandidates: SourceReadinessSummary[];
  lookupAutomationConstraintSources: SourceReadinessSummary[];
  sourcesByResearchOutcome: Record<SourceResearchPlanningOutcome, number>;
  registryOnlySourceCount: number;
  note: string;
};

export const SOURCE_RESEARCH_OUTCOMES = [
  "implemented_adapter",
  "adapter_candidate",
  "needs_manual_research",
  "blocked_by_terms",
  "blocked_by_access_controls",
  "blocked_by_no_stable_source",
  "not_contractor_specific",
] as const;

export type SourceResearchPlanningOutcome = (typeof SOURCE_RESEARCH_OUTCOMES)[number];

export function buildSourceReadiness(sources: SourceRegistryEntry[]): SourceReadiness {
  const implementedAdapterSources = sources.filter((source) => source.adapterStatus === "implemented");
  const unimplementedBulkAdapterCandidates = sources.filter(isUnimplementedBulkAdapterCandidate);
  const downloadResearchCandidates = sources.filter(isDownloadResearchCandidate);
  const lookupAutomationConstraintSources = sources.filter(hasLookupAutomationConstraint);
  const registryOnlySources = sources.filter((source) => source.adapterMaturity === "registry_only");

  return {
    sourceCount: sources.length,
    implementedAdapterSources: implementedAdapterSources.map(toSourceReadinessSummary),
    unimplementedBulkAdapterCandidates: unimplementedBulkAdapterCandidates.map(toSourceReadinessSummary),
    downloadResearchCandidates: downloadResearchCandidates.map(toSourceReadinessSummary),
    lookupAutomationConstraintSources: lookupAutomationConstraintSources.map(toSourceReadinessSummary),
    sourcesByResearchOutcome: countSourcesByResearchOutcome(sources),
    registryOnlySourceCount: registryOnlySources.length,
    note: SOURCE_READINESS_NOTE,
  };
}

export function isBulkShapedCandidate(source: SourceRegistryEntry): boolean {
  return source.hasBulkDownload === true || source.sourceType.startsWith("bulk_") || source.sourceType === "api";
}

export function isUnimplementedBulkAdapterCandidate(source: SourceRegistryEntry): boolean {
  return ["planned", "experimental"].includes(source.adapterStatus) && !["blocked", "deprecated"].includes(source.adapterMaturity) && isBulkShapedCandidate(source);
}

export function isDownloadResearchCandidate(source: SourceRegistryEntry): boolean {
  if (!["planned", "experimental"].includes(source.adapterStatus) || source.adapterMaturity !== "registry_only") {
    return false;
  }

  const notes = [source.officialBulkDownloadNotes, source.researchNotes, source.maintainerNotes]
    .filter((value) => typeof value === "string")
    .join(" ");

  return /\b(publishes posting-list|links? to .*roster|says .*download\w*|downloaded at no cost|downloaded as|roster generation|download pages|may publish .*reports?|links current lists)\b/i.test(
    notes,
  );
}

export function hasLookupAutomationConstraint(source: SourceRegistryEntry): boolean {
  return (
    ["planned", "experimental"].includes(source.adapterStatus) &&
    (source.sourceType === "html_lookup" || source.sourceType === "playwright_portal") &&
    (source.requiresJavaScript === true || source.requiresCaptcha === true || source.requiresAccount === true)
  );
}

export function getSourceResearchOutcome(source: SourceRegistryEntry): SourceResearchPlanningOutcome {
  if (source.adapterStatus === "implemented") {
    return "implemented_adapter";
  }

  if (isDownloadResearchCandidate(source) || isUnimplementedBulkAdapterCandidate(source)) {
    return "adapter_candidate";
  }

  if (source.requiresCaptcha === true || source.requiresAccount === true) {
    return "blocked_by_access_controls";
  }

  if (!source.officialLookupUrl || source.hasLiveLookup === false) {
    return "blocked_by_no_stable_source";
  }

  if (isBroadNonContractorSpecificSource(source)) {
    return "not_contractor_specific";
  }

  if (!source.termsUrl) {
    return "blocked_by_terms";
  }

  return "needs_manual_research";
}

export function getSourceResearchNextAction(source: SourceRegistryEntry): string {
  switch (getSourceResearchOutcome(source)) {
    case "implemented_adapter":
      return "Maintain adapter tests, caveats, and optional live-source research before maturity promotion.";
    case "adapter_candidate":
      return "Review official terms, field shape, fixture safety, filters, and verification caveats before adapter work.";
    case "blocked_by_access_controls":
      return "Do not automate protected lookup paths; prefer official exports or document the access blocker.";
    case "blocked_by_no_stable_source":
      return "Find a stable official lookup, file, API, or document why adapter work is blocked.";
    case "blocked_by_terms":
      return "Locate official terms or document why redistribution/automation remains blocked.";
    case "not_contractor_specific":
      return "Narrow the source to contractor or skilled-trade records before adapter work.";
    case "needs_manual_research":
      return "Perform source-specific terms, field-shape, fixture, and caveat research.";
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
  };
}

function countSourcesByResearchOutcome(sources: SourceRegistryEntry[]): Record<SourceResearchPlanningOutcome, number> {
  const counts = Object.fromEntries(SOURCE_RESEARCH_OUTCOMES.map((outcome) => [outcome, 0])) as Record<SourceResearchPlanningOutcome, number>;
  for (const source of sources) {
    counts[getSourceResearchOutcome(source)] += 1;
  }
  return counts;
}

function isBroadNonContractorSpecificSource(source: SourceRegistryEntry): boolean {
  const text = [source.id, source.name, source.researchNotes, source.maintainerNotes, ...source.knownExclusions].join(" ").toLowerCase();
  return (
    text.includes("business license") ||
    text.includes("many license") ||
    text.includes("many profession") ||
    text.includes("professional license") ||
    text.includes("construction-adjacent") ||
    text.includes("not isolate every construction")
  );
}
