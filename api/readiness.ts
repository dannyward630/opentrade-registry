import { loadSourceReadinessForApi } from "./registry.js";
import type { ApiRequest, ApiResponse } from "./types.js";

export default async function handler(_request: ApiRequest, response: ApiResponse) {
  const readiness = await loadSourceReadinessForApi();
  response.status(200).json(readiness);
}
