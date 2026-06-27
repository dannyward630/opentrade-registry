import { loadSourceReadinessForApi } from "./registry.js";
import type { ApiRequest, ApiResponse } from "./types.js";
import { applyPublicApiHeaders, withApiVersion } from "./http.js";

export default async function handler(_request: ApiRequest, response: ApiResponse) {
  applyPublicApiHeaders(response);
  const readiness = await loadSourceReadinessForApi();
  response.status(200).json(withApiVersion(readiness));
}
