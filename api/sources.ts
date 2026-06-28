import { loadSourcesForApi } from "./registry.js";
import type { ApiRequest, ApiResponse } from "./types.js";
import {
  filterSources,
  getSourceResearchNextAction,
  getSourceResearchOutcome,
  SOURCE_RESEARCH_OUTCOMES,
  type SourceFilterOptions,
  type SourceRegistryEntry,
} from "@opentrade-registry/core";
import { applyPublicApiHeaders, withApiVersion } from "./http.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  applyPublicApiHeaders(response);
  const result = await loadSourcesForApi();
  const sources = result.sources;
  const sourceId = typeof request.query.id === "string" ? request.query.id : null;

  if (sourceId) {
    const source = sources.find((entry) => entry.id === sourceId);
    if (!source) {
      response.status(404).json(withApiVersion({
        error: "not_found",
        message: "No matching source registry entry was found."
      }));
      return;
    }

    response.status(200).json(withApiVersion({ ...serializeSource(source), origin: result.origin }));
    return;
  }

  let filtered: { sources: SourceRegistryEntry[]; filters: SourceFilterOptions };
  try {
    filtered = filterSourcesForApi(sources, request.query);
  } catch (error) {
    response.status(400).json(withApiVersion({
      error: "invalid_filter",
      message: error instanceof Error ? error.message : String(error),
    }));
    return;
  }

  response.status(200).json(withApiVersion({
    origin: result.origin,
    count: filtered.sources.length,
    sources: filtered.sources.map(serializeSource),
    filters: filtered.filters,
    databaseError: result.databaseError,
  }));
}

export function filterSourcesForApi(
  sources: SourceRegistryEntry[],
  query: ApiRequest["query"],
): { sources: SourceRegistryEntry[]; filters: SourceFilterOptions } {
  const filters = parseSourceFilters(query);
  return {
    sources: filterSources(sources, filters),
    filters,
  };
}

const SOURCE_TYPES = ["bulk_csv", "bulk_xlsx", "bulk_json", "api", "html_lookup", "playwright_portal", "manual_public_records_file"] as const;
const ADAPTER_MATURITIES = ["registry_only", "fixture_adapter", "local_file_adapter", "network_opt_in", "production_ready", "blocked", "deprecated"] as const;
const ADAPTER_STATUSES = ["planned", "implemented", "experimental", "blocked", "deprecated"] as const;
function parseSourceFilters(query: ApiRequest["query"]): SourceFilterOptions {
  return {
    state: stringQuery(query.state)?.toUpperCase(),
    maturity: enumQuery(query.maturity, "maturity", ADAPTER_MATURITIES),
    status: enumQuery(query.status, "status", ADAPTER_STATUSES),
    sourceType: enumQuery(query.sourceType ?? query.source_type, "sourceType", SOURCE_TYPES),
    qualityLevel: numberQuery(query.qualityLevel ?? query.quality_level, "qualityLevel"),
    researchOutcome: enumQuery(query.researchOutcome ?? query.research_outcome, "researchOutcome", SOURCE_RESEARCH_OUTCOMES),
    implemented: booleanQuery(query.implemented),
    registryOnly: booleanQuery(query.registryOnly ?? query.registry_only),
    bulkCandidates: booleanQuery(query.bulkCandidates ?? query.bulk_candidates),
  };
}

function serializeSource(source: SourceRegistryEntry) {
  return {
    ...source,
    sourceResearchOutcome: getSourceResearchOutcome(source),
    nextAction: getSourceResearchNextAction(source),
  };
}

function stringQuery(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function enumQuery<const T extends readonly string[]>(
  value: string | string[] | undefined,
  name: string,
  allowed: T,
): T[number] | undefined {
  const parsed = stringQuery(value);
  if (parsed === undefined) {
    return undefined;
  }

  if (!allowed.includes(parsed)) {
    throw new Error(`Invalid ${name} filter: ${parsed}. Expected one of: ${allowed.join(", ")}`);
  }

  return parsed;
}

function numberQuery(value: string | string[] | undefined, name: string): number | undefined {
  const parsed = stringQuery(value);
  if (parsed === undefined) {
    return undefined;
  }

  const number = Number(parsed);
  if (Number.isNaN(number)) {
    throw new Error(`Invalid ${name} filter: ${parsed}.`);
  }

  return number;
}

function booleanQuery(value: string | string[] | undefined): boolean | undefined {
  const parsed = stringQuery(value);
  if (parsed === undefined) {
    return undefined;
  }

  return ["1", "true", "yes"].includes(parsed.toLowerCase());
}
