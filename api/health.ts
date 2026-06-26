import { compareSourceMirrors, createDatabaseClientFromEnv, loadSourcesFromDatabase, loadSourcesFromFiles, type RegistryDatabaseClient, type SourceMirrorMismatch } from "./registry.js";
import type { ApiRequest, ApiResponse } from "./types.js";

export default async function handler(_request: ApiRequest, response: ApiResponse) {
  const health = await getHealthStatus();
  response.status(health.statusCode).json(health.body);
}

export async function getHealthStatus(options: { rootDir?: string; databaseClient?: RegistryDatabaseClient | null } = {}) {
  const fileSources = await loadSourcesFromFiles(options.rootDir);
  const fileRegistrySourceCount = fileSources.length;
  const databaseClient = Object.prototype.hasOwnProperty.call(options, "databaseClient")
    ? options.databaseClient
    : createDatabaseClientFromEnv();

  if (!databaseClient) {
    return {
      statusCode: 200,
      body: {
        ok: true,
        service: "opentrade-registry",
        fileRegistrySourceCount,
        database: {
          configured: false,
          status: "not_configured",
        },
      },
    };
  }

  let registrySourceCount = 0;
  let error: string | undefined;
  let sourceMetadataMatchesFiles = false;
  let sourceMetadataMismatchCount = 0;
  let sourceMetadataMismatches: SourceMirrorMismatch[] = [];
  try {
    const databaseSources = await loadSourcesFromDatabase(databaseClient, fileSources);
    registrySourceCount = databaseSources.length;
    const comparison = compareSourceMirrors(fileSources, databaseSources);
    sourceMetadataMatchesFiles = comparison.sourceMetadataMatchesFiles;
    sourceMetadataMismatchCount = comparison.sourceMetadataMismatchCount;
    sourceMetadataMismatches = comparison.sourceMetadataMismatches;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unknown database source loading error";
  }

  const sourceCountMatchesFiles = registrySourceCount === fileRegistrySourceCount;
  const ok = !error && sourceCountMatchesFiles && sourceMetadataMatchesFiles;

  return {
    statusCode: ok ? 200 : 503,
    body: {
      ok,
      service: "opentrade-registry",
      fileRegistrySourceCount,
      database: {
        configured: true,
        status: error ? "unavailable" : "available",
        registrySourceCount,
        sourceCountMatchesFiles,
        sourceMetadataMatchesFiles,
        sourceMetadataMismatchCount,
        sourceMetadataMismatches,
        error,
      },
    },
  };
}
