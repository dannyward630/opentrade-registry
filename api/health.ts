import { countSourcesFromDatabase, createDatabaseClientFromEnv, loadSourcesFromFiles, type RegistryDatabaseClient } from "./registry.js";
import type { ApiRequest, ApiResponse } from "./types.js";

export default async function handler(_request: ApiRequest, response: ApiResponse) {
  const health = await getHealthStatus();
  response.status(health.statusCode).json(health.body);
}

export async function getHealthStatus(options: { rootDir?: string; databaseClient?: RegistryDatabaseClient | null } = {}) {
  const fileRegistrySourceCount = (await loadSourcesFromFiles(options.rootDir)).length;
  const databaseClient = Object.hasOwn(options, "databaseClient") ? options.databaseClient : createDatabaseClientFromEnv();

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
  try {
    registrySourceCount = await countSourcesFromDatabase(databaseClient);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unknown database source count error";
  }

  return {
    statusCode: error ? 503 : 200,
    body: {
      ok: !error,
      service: "opentrade-registry",
      fileRegistrySourceCount,
      database: {
        configured: true,
        status: error ? "unavailable" : "available",
        registrySourceCount,
        sourceCountMatchesFiles: registrySourceCount === fileRegistrySourceCount,
        error,
      },
    },
  };
}
