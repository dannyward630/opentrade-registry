import { describe, expect, it, vi } from "vitest";
import { createPostgresDeveloperKeyStore } from "../services/record-api/src/postgres-api-keys.js";
import type { SqlClient } from "../services/record-api/src/postgres.js";

describe("Postgres developer key store", () => {
  it("stores hash bytes and atomically consumes quota with parameters", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: "public-key-1", name: "Build", key_prefix: "otr_live_12345678", quota_per_day: 100, created_at: new Date("2026-06-29T00:00:00Z") }] })
      .mockResolvedValueOnce({ rows: [{ allowed: true, request_count: 1, quota_per_day: 100 }] });
    const store = createPostgresDeveloperKeyStore({ query } as SqlClient);
    const secretHash = Buffer.alloc(32, 7);
    await store.insert({ userId: "user-1", name: "Build", keyPrefix: "otr_live_12345678", secretHash });
    await expect(store.consumeDailyQuota("42", "2026-06-29")).resolves.toEqual({ allowed: true, requestCount: 1, quotaPerDay: 100 });
    expect(query.mock.calls[0]![0]).not.toContain("user-1");
    expect(query.mock.calls[0]![1]).toEqual(["user-1", "Build", "otr_live_12345678", secretHash]);
    expect(query.mock.calls[1]![0]).toContain("on conflict (api_key_id, usage_date) do update");
    expect(query.mock.calls[1]![1]).toEqual(["42", "2026-06-29"]);
  });
});
