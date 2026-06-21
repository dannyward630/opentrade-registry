import { loadSourcesForApi } from "./registry.js";
import type { ApiRequest, ApiResponse } from "./types.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const result = await loadSourcesForApi();
  const sources = result.sources;
  const sourceId = typeof request.query.id === "string" ? request.query.id : null;

  if (sourceId) {
    const source = sources.find((entry) => entry.id === sourceId);
    if (!source) {
      response.status(404).json({
        error: "not_found",
        message: "No matching source registry entry was found."
      });
      return;
    }

    response.status(200).json({ ...source, origin: result.origin });
    return;
  }

  response.status(200).json({
    origin: result.origin,
    count: sources.length,
    sources,
    databaseError: result.databaseError,
  });
}
