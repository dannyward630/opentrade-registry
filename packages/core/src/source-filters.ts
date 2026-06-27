import type { SourceRegistryEntry } from "./schema/source-registry.js";
import { getSourceResearchOutcome, isUnimplementedBulkAdapterCandidate, type SourceResearchPlanningOutcome } from "./source-readiness.js";

export type SourceFilterOptions = {
  state?: string;
  maturity?: SourceRegistryEntry["adapterMaturity"];
  status?: SourceRegistryEntry["adapterStatus"];
  sourceType?: SourceRegistryEntry["sourceType"];
  qualityLevel?: number;
  researchOutcome?: SourceResearchPlanningOutcome;
  implemented?: boolean;
  registryOnly?: boolean;
  bulkCandidates?: boolean;
};

export function filterSources(entries: SourceRegistryEntry[], options: SourceFilterOptions): SourceRegistryEntry[] {
  return entries.filter((entry) => {
    if (options.state && entry.jurisdiction.state.toUpperCase() !== options.state.toUpperCase()) {
      return false;
    }

    if (options.maturity && entry.adapterMaturity !== options.maturity) {
      return false;
    }

    if (options.status && entry.adapterStatus !== options.status) {
      return false;
    }

    if (options.sourceType && entry.sourceType !== options.sourceType) {
      return false;
    }

    if (typeof options.qualityLevel === "number" && (entry.adapterQualityLevel ?? 0) !== options.qualityLevel) {
      return false;
    }

    if (options.researchOutcome && getSourceResearchOutcome(entry) !== options.researchOutcome) {
      return false;
    }

    if (options.implemented && entry.adapterStatus !== "implemented") {
      return false;
    }

    if (options.registryOnly && entry.adapterMaturity !== "registry_only") {
      return false;
    }

    if (options.bulkCandidates && !isUnimplementedBulkAdapterCandidate(entry)) {
      return false;
    }

    return true;
  });
}
