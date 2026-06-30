import { normalizeLicenseNumber, type NationwideBoardInventory } from "@opentrade-registry/core";
import { ApiKeyError, type createDeveloperKeyService } from "./api-keys.js";
import { AuthenticationError, type IdentityVerifier } from "./supabase-auth.js";

export type StoredLicenseRecord = {
  id: string;
  sourceId: string;
  sourceSnapshotId: string;
  recordVersion: string;
  jurisdictionState: string;
  licenseNumber: string;
  licenseNumberNormalized: string;
  businessName: string | null;
  licenseeName: string | null;
  normalizedStatus: string;
  tradeCategories: string[];
  observedAt: string;
  publicationDisposition: "allowed" | "review_required" | "restricted" | "withheld";
  sensitivityLevel: string;
  sourceUrl: string;
  caveats: string[];
  canonicalRecord: unknown;
};

export type LicenseSearchQuery = {
  licenseNumber?: string;
  businessName?: string;
  state?: string;
  sourceId?: string;
  status?: string;
  trade?: string;
  cursor?: string;
  limit: number;
};

export type VerificationJob = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  result?: unknown;
};

export interface RecordRepository {
  searchLicenses(query: LicenseSearchQuery): Promise<{ records: StoredLicenseRecord[]; nextCursor: string | null }>;
  getLicense(id: string): Promise<StoredLicenseRecord | null>;
  enqueueVerification(input: { sourceId: string; licenseNumber: string }): Promise<VerificationJob>;
  getVerificationJob(id: string): Promise<VerificationJob | null>;
}

export type PublicSourceMetadata = {
  id: string;
  name: string;
  sourceUrl: string;
  officialLookupUrl?: string | null;
  verificationCaveats?: string[];
};

export type RecordApiOptions = {
  repository: RecordRepository;
  sources: PublicSourceMetadata[];
  boardInventory: NationwideBoardInventory;
  allowedOrigins?: string[];
  identityVerifier?: IdentityVerifier;
  developerKeyService?: ReturnType<typeof createDeveloperKeyService>;
  anonymousRateLimiter?: AnonymousRateLimiter;
};

export interface AnonymousRateLimiter {
  allow(clientId: string): { allowed: boolean; remaining: number; resetAt: number };
}

export function createRecordApi(options: RecordApiOptions): (request: Request) => Promise<Response> {
  const sources = new Map(options.sources.map((source) => [source.id, source]));
  const boards = new Map(options.boardInventory.boards.flatMap((board) => board.sourceIds.map((sourceId) => [sourceId, board] as const)));

  return async (request) => {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") return response(null, 204, request, options.allowedOrigins);

      if (request.method === "GET" && url.pathname === "/api/v2/sources") {
        return response({
          apiVersion: "2.0",
          count: options.sources.length,
          completeness: options.boardInventory.completeness,
          sources: options.sources.map((source) => ({ ...source, accessPath: boards.get(source.id)?.accessPath ?? "blocked" })),
        }, 200, request, options.allowedOrigins, "public, max-age=300");
      }

      if (request.method === "GET" && url.pathname === "/api/v2/licenses/search") {
        const rateLimitHeaders = await authorizeSearch(request, options);
        const query = parseSearchQuery(url.searchParams);
        const result = await options.repository.searchLicenses(query);
        return response({ apiVersion: "2.0", ...result }, 200, request, options.allowedOrigins, "public, max-age=60", rateLimitHeaders);
      }

      if (url.pathname === "/api/v2/developer/keys" && ["GET", "POST"].includes(request.method)) {
        const identity = await requireIdentity(request, options);
        const service = requireDeveloperKeyService(options);
        if (request.method === "GET") {
          return response({ apiVersion: "2.0", keys: await service.list(identity.userId) }, 200, request, options.allowedOrigins);
        }
        const name = await parseKeyName(request);
        return response({ apiVersion: "2.0", ...await service.create(identity.userId, name) }, 201, request, options.allowedOrigins);
      }

      const developerKeyId = matchPath(url.pathname, "/api/v2/developer/keys/");
      if (request.method === "DELETE" && developerKeyId) {
        const identity = await requireIdentity(request, options);
        await requireDeveloperKeyService(options).revoke(identity.userId, developerKeyId);
        return response(null, 204, request, options.allowedOrigins);
      }

      const licenseId = matchPath(url.pathname, "/api/v2/licenses/");
      if (request.method === "GET" && licenseId) {
        const record = await options.repository.getLicense(licenseId);
        if (!record) return errorResponse("not_found", "No published record was found for this ID.", 404, request, options.allowedOrigins);
        return response({ apiVersion: "2.0", record }, 200, request, options.allowedOrigins, "public, max-age=60");
      }

      if (request.method === "POST" && url.pathname === "/api/v2/verifications") {
        const input = await parseVerificationInput(request);
        const source = sources.get(input.sourceId);
        if (!source) return errorResponse("unknown_source", "The requested source is not registered.", 404, request, options.allowedOrigins);
        const matches = await options.repository.searchLicenses({ licenseNumber: input.licenseNumber, sourceId: input.sourceId, limit: 2 });
        if (matches.records.length === 1) {
          return response({ apiVersion: "2.0", result: "indexed_match", checkedAt: new Date().toISOString(), record: matches.records[0] }, 200, request, options.allowedOrigins);
        }
        if (matches.records.length > 1) {
          return response({ apiVersion: "2.0", result: "ambiguous", checkedAt: new Date().toISOString(), records: matches.records }, 200, request, options.allowedOrigins);
        }
        const accessPath = boards.get(input.sourceId)?.accessPath ?? "blocked";
        if (accessPath === "browser_lookup") {
          const job = await options.repository.enqueueVerification(input);
          return response({ apiVersion: "2.0", result: "pending", jobId: job.id, checkedAt: new Date().toISOString() }, 200, request, options.allowedOrigins);
        }
        if (accessPath === "manual_handoff") {
          return response({
            apiVersion: "2.0",
            result: "manual_required",
            checkedAt: new Date().toISOString(),
            manualHandoff: {
              url: source.officialLookupUrl ?? source.sourceUrl,
              instructions: ["Use the official lookup and retain the checked time, result, and source caveats."],
            },
          }, 200, request, options.allowedOrigins);
        }
        if (accessPath === "blocked" || accessPath === "deprecated") {
          return response({ apiVersion: "2.0", result: "source_unavailable", checkedAt: new Date().toISOString(), reasons: ["The source is not available for automated verification."] }, 200, request, options.allowedOrigins);
        }
        return response({
          apiVersion: "2.0",
          result: "not_found",
          checkedAt: new Date().toISOString(),
          reasons: ["No matching record was found in this source as of the checked time."],
          caveats: source.verificationCaveats ?? [],
        }, 200, request, options.allowedOrigins);
      }

      const verificationJobId = matchPath(url.pathname, "/api/v2/verifications/");
      if (request.method === "GET" && verificationJobId) {
        const job = await options.repository.getVerificationJob(verificationJobId);
        if (!job) return errorResponse("not_found", "No verification job was found for this ID.", 404, request, options.allowedOrigins);
        return response({ apiVersion: "2.0", job }, 200, request, options.allowedOrigins, "private, no-store");
      }

      return errorResponse("not_found", "Route not found.", 404, request, options.allowedOrigins);
    } catch (error) {
      if (error instanceof InvalidRequestError) return errorResponse("invalid_request", error.message, 400, request, options.allowedOrigins);
      if (error instanceof AuthenticationError) return errorResponse("authentication_required", error.message, 401, request, options.allowedOrigins);
      if (error instanceof ApiKeyError) {
        const status = error.code === "quota_exceeded" ? 429 : error.code === "not_found" ? 404 : error.code === "invalid_name" ? 400 : 401;
        return errorResponse(error.code, error.message, status, request, options.allowedOrigins);
      }
      if (error instanceof AnonymousRateLimitError) {
        const retryAfter = Math.max(1, Math.ceil((error.resetAt - Date.now()) / 1000));
        return response({ apiVersion: "2.0", error: { code: "rate_limit_exceeded", message: error.message } }, 429, request, options.allowedOrigins, "no-store", { "retry-after": String(retryAfter) });
      }
      console.error("record_api_request_failed", error instanceof Error ? error.message : String(error));
      return errorResponse("internal_error", "The request could not be completed.", 500, request, options.allowedOrigins);
    }
  };
}

function parseSearchQuery(params: URLSearchParams): LicenseSearchQuery {
  const limit = parseInteger(params.get("limit") ?? "25");
  if (limit < 1 || limit > 100) throw new InvalidRequestError("limit must be between 1 and 100.");
  const licenseNumber = normalizeLicenseNumber(params.get("license"));
  const businessName = clean(params.get("business"));
  if (!licenseNumber && !businessName) throw new InvalidRequestError("Provide license or business search input.");
  const state = clean(params.get("state"))?.toUpperCase();
  if (state && !/^[A-Z]{2}$/.test(state)) throw new InvalidRequestError("state must be a two-letter code.");
  return {
    licenseNumber: licenseNumber ?? undefined,
    businessName: businessName ?? undefined,
    state,
    sourceId: clean(params.get("source")) ?? undefined,
    status: clean(params.get("status")) ?? undefined,
    trade: clean(params.get("trade")) ?? undefined,
    cursor: clean(params.get("cursor")) ?? undefined,
    limit,
  };
}

async function parseVerificationInput(request: Request): Promise<{ sourceId: string; licenseNumber: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new InvalidRequestError("Expected application/json.");
  const value = await request.json().catch(() => null) as Record<string, unknown> | null;
  const sourceId = clean(value?.sourceId);
  const licenseNumber = normalizeLicenseNumber(typeof value?.licenseNumber === "string" ? value.licenseNumber : undefined);
  if (!sourceId || !licenseNumber) throw new InvalidRequestError("sourceId and licenseNumber are required.");
  return { sourceId, licenseNumber };
}

function response(body: unknown, status: number, request: Request, allowedOrigins: string[] | undefined, cacheControl = "no-store", extraHeaders?: Record<string, string>): Response {
  const headers = new Headers({ "cache-control": cacheControl, "x-content-type-options": "nosniff" });
  for (const [name, value] of Object.entries(extraHeaders ?? {})) headers.set(name, value);
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins?.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    headers.set("access-control-allow-headers", "authorization, content-type, x-api-key");
    headers.set("vary", "Origin");
  }
  if (body === null) return new Response(null, { status, headers });
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(code: string, message: string, status: number, request: Request, allowedOrigins?: string[]): Response {
  return response({ apiVersion: "2.0", error: { code, message } }, status, request, allowedOrigins);
}

function matchPath(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length);
  return value && !value.includes("/") ? decodeURIComponent(value) : null;
}

function parseInteger(value: string): number {
  if (!/^\d+$/.test(value)) throw new InvalidRequestError("Expected an integer value.");
  return Number(value);
}

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

class InvalidRequestError extends Error {}

async function requireIdentity(request: Request, options: RecordApiOptions) {
  if (!options.identityVerifier) throw new AuthenticationError();
  return options.identityVerifier.verify(request.headers.get("authorization"));
}

function requireDeveloperKeyService(options: RecordApiOptions): ReturnType<typeof createDeveloperKeyService> {
  if (!options.developerKeyService) throw new AuthenticationError();
  return options.developerKeyService;
}

async function parseKeyName(request: Request): Promise<string> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) throw new InvalidRequestError("Expected application/json.");
  const value = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = clean(value?.name);
  if (!name) throw new InvalidRequestError("name is required.");
  return name;
}

async function authorizeSearch(request: Request, options: RecordApiOptions): Promise<Record<string, string>> {
  const rawKey = clean(request.headers.get("x-api-key"));
  if (rawKey) {
    if (!options.developerKeyService) throw new ApiKeyError("invalid_api_key", "Invalid API key.");
    const authenticated = await options.developerKeyService.authenticate(rawKey);
    return {
      "x-ratelimit-limit": String(authenticated.quota.quotaPerDay),
      "x-ratelimit-remaining": String(Math.max(0, authenticated.quota.quotaPerDay - authenticated.quota.requestCount)),
    };
  }
  if (!options.anonymousRateLimiter) return {};
  const clientId = clean(request.headers.get("x-forwarded-for"))?.split(",")[0]!.trim() ?? "unknown";
  const result = options.anonymousRateLimiter.allow(clientId);
  if (!result.allowed) throw new AnonymousRateLimitError(result.resetAt);
  return { "x-ratelimit-remaining": String(result.remaining) };
}

class AnonymousRateLimitError extends Error {
  constructor(readonly resetAt: number) { super("Anonymous search rate limit exceeded."); }
}
