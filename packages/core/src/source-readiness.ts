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
};

export type SourceReadiness = {
  sourceCount: number;
  implementedAdapterSources: SourceReadinessSummary[];
  unimplementedBulkAdapterCandidates: SourceReadinessSummary[];
  registryOnlySourceCount: number;
  note: string;
};

export function buildSourceReadiness(sources: SourceRegistryEntry[]): SourceReadiness {
  const implementedAdapterSources = sources.filter((source) => source.adapterStatus === "implemented");
  const unimplementedBulkAdapterCandidates = sources.filter(isUnimplementedBulkAdapterCandidate);
  const registryOnlySources = sources.filter((source) => source.adapterMaturity === "registry_only");

  return {
    sourceCount: sources.length,
    implementedAdapterSources: implementedAdapterSources.map(toSourceReadinessSummary),
    unimplementedBulkAdapterCandidates: unimplementedBulkAdapterCandidates.map(toSourceReadinessSummary),
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
  };
}
