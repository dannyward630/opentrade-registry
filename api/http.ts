import { OPENTRADE_API_VERSION } from "@opentrade/core";
import type { ApiResponse } from "./types.js";

export function applyPublicApiHeaders(response: ApiResponse, options: { health?: boolean } = {}): void {
  response.setHeader?.("Access-Control-Allow-Origin", "*");
  response.setHeader?.("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader?.("Access-Control-Allow-Headers", "Accept, Content-Type");
  response.setHeader?.("X-Content-Type-Options", "nosniff");
  response.setHeader?.("Cache-Control", options.health ? "no-store" : "public, max-age=60, stale-while-revalidate=300");
}

export function withApiVersion<T extends Record<string, unknown>>(body: T): T & { apiVersion: string } {
  return { apiVersion: OPENTRADE_API_VERSION, ...body };
}
