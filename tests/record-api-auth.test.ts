import { describe, expect, it, vi } from "vitest";
import { createRecordApi, type RecordRepository } from "../services/record-api/src/index.js";
import type { DeveloperKeyMetadata } from "../services/record-api/src/api-keys.js";
import { ApiKeyError } from "../services/record-api/src/api-keys.js";
import { AuthenticationError } from "../services/record-api/src/supabase-auth.js";
import { setTrustedClientAddress } from "../services/record-api/src/client-address.js";

const keyMetadata: DeveloperKeyMetadata = {
  id: "key-1",
  name: "Build",
  keyPrefix: "otr_live_12345678",
  quotaPerDay: 100,
  createdAt: "2026-06-30T00:00:00.000Z",
};

describe("v2 record API authentication", () => {
  it("creates, lists, and revokes keys for a verified developer", async () => {
    const identityVerifier = { verify: vi.fn(async () => ({ userId: "user-1" })) };
    const developerKeyService = {
      create: vi.fn(async () => ({ key: keyMetadata, rawKey: "otr_live_12345678_secret" })),
      list: vi.fn(async () => [keyMetadata]),
      revoke: vi.fn(async () => undefined),
      authenticate: vi.fn(),
    };
    const api = createRecordApi({
      repository: fakeRepository(), sources: [], boardInventory: inventory(), identityVerifier, developerKeyService,
    });

    const created = await api(request("/api/v2/developer/keys", "POST", { name: "Build" }));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ key: keyMetadata, rawKey: "otr_live_12345678_secret" });
    expect(developerKeyService.create).toHaveBeenCalledWith("user-1", "Build");

    const listed = await api(request("/api/v2/developer/keys"));
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({ keys: [keyMetadata] });
    expect(JSON.stringify(await developerKeyService.list.mock.results[0]?.value)).not.toContain("rawKey");

    const revoked = await api(request("/api/v2/developer/keys/key-1", "DELETE"));
    expect(revoked.status).toBe(204);
    expect(developerKeyService.revoke).toHaveBeenCalledWith("user-1", "key-1");
  });

  it("requires a valid Supabase bearer token for key management", async () => {
    const identityVerifier = { verify: vi.fn(async () => { throw new AuthenticationError(); }) };
    const api = createRecordApi({ repository: fakeRepository(), sources: [], boardInventory: inventory(), identityVerifier });
    const response = await api(request("/api/v2/developer/keys"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "authentication_required" } });
  });

  it("enforces developer-key authentication and daily quotas on search", async () => {
    const authenticate = vi.fn()
      .mockRejectedValueOnce(new ApiKeyError("invalid_api_key", "Invalid API key."))
      .mockRejectedValueOnce(new ApiKeyError("quota_exceeded", "Daily API quota exceeded."))
      .mockResolvedValueOnce({ id: "key-1", userId: "user-1", quota: { requestCount: 2, quotaPerDay: 100 } });
    const api = createRecordApi({
      repository: fakeRepository(), sources: [], boardInventory: inventory(),
      developerKeyService: { authenticate, create: vi.fn(), list: vi.fn(), revoke: vi.fn() },
    });
    const invalid = await api(searchRequest("bad"));
    const limited = await api(searchRequest("otr_live_12345678_limited"));
    const valid = await api(searchRequest("otr_live_12345678_valid"));
    expect(invalid.status).toBe(401);
    expect(limited.status).toBe(429);
    expect(valid.status).toBe(200);
    expect(valid.headers.get("x-ratelimit-remaining")).toBe("98");
  });

  it("rate limits anonymous searches by client address", async () => {
    const allowAnonymousRequest = vi.fn()
      .mockReturnValueOnce({ allowed: true, remaining: 0, resetAt: 100 })
      .mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: 100 });
    const api = createRecordApi({ repository: fakeRepository(), sources: [], boardInventory: inventory(), anonymousRateLimiter: { allow: allowAnonymousRequest } });
    expect((await api(searchRequest())).status).toBe(200);
    const limited = await api(searchRequest());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("ignores caller-controlled forwarding headers for anonymous identity", async () => {
    const allow = vi.fn(() => ({ allowed: true, remaining: 1, resetAt: 100 }));
    const api = createRecordApi({ repository: fakeRepository(), sources: [], boardInventory: inventory(), anonymousRateLimiter: { allow } });
    const request = new Request("https://api.example.test/api/v2/licenses/search?license=ABC123", {
      headers: { "x-forwarded-for": "198.51.100.20", "x-opentrade-client-ip": "127.0.0.1" },
    });
    setTrustedClientAddress(request, "127.0.0.1");
    await api(request);
    expect(allow).toHaveBeenCalledWith("127.0.0.1");
  });
});

function request(path: string, method = "GET", body?: unknown): Request {
  return new Request(`https://api.example.test${path}`, {
    method,
    headers: { authorization: "Bearer access-token", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function searchRequest(apiKey?: string): Request {
  return new Request("https://api.example.test/api/v2/licenses/search?license=ABC123", {
    headers: { "x-forwarded-for": "203.0.113.10", ...(apiKey ? { "x-api-key": apiKey } : {}) },
  });
}

function fakeRepository(): RecordRepository {
  return {
    searchLicenses: vi.fn(async () => ({ records: [], nextCursor: null })),
    getLicense: vi.fn(async () => null),
    enqueueVerification: vi.fn(async () => ({ id: "job-1", status: "pending" as const })),
    getVerificationJob: vi.fn(async () => null),
  };
}

function inventory() {
  return {
    schemaVersion: "2.0", completeness: "representative_source_baseline",
    scope: { jurisdictions: "states_dc_major_territories", municipalLicensing: "excluded", notes: ["Fixture."] },
    boards: [],
  } as never;
}
