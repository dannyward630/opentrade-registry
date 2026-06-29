import { describe, expect, it, vi } from "vitest";
import { createDeveloperKeyService, type DeveloperKeyStore } from "../services/record-api/src/api-keys.js";

describe("developer API keys", () => {
  it("returns a raw key once while storing only its hash", async () => {
    const store = fakeStore();
    const service = createDeveloperKeyService(store);
    const created = await service.create("user-1", "Local development");
    expect(created.rawKey).toMatch(/^otr_live_[a-zA-Z0-9_-]{8}_[a-zA-Z0-9_-]+$/);
    expect(store.insert).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      name: "Local development",
      keyPrefix: created.key.keyPrefix,
      secretHash: expect.any(Buffer),
    }));
    expect(JSON.stringify(store.insert.mock.calls[0])).not.toContain(created.rawKey);
  });

  it("uses constant hash verification and consumes quota", async () => {
    const store = fakeStore();
    const service = createDeveloperKeyService(store);
    const created = await service.create("user-1", "Production");
    store.findActiveByPrefix.mockResolvedValue({
      id: "key-1",
      userId: "user-1",
      keyPrefix: created.key.keyPrefix,
      secretHash: store.insert.mock.calls[0]![0].secretHash,
      quotaPerDay: 100,
    });
    store.consumeDailyQuota.mockResolvedValue({ allowed: true, requestCount: 1, quotaPerDay: 100 });
    await expect(service.authenticate(created.rawKey)).resolves.toMatchObject({ id: "key-1", userId: "user-1" });
    expect(store.consumeDailyQuota).toHaveBeenCalledWith("key-1", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    await expect(service.authenticate(`${created.rawKey}x`)).rejects.toThrow(/invalid api key/i);
  });
});

function fakeStore() {
  return {
    insert: vi.fn(async (input) => ({ id: "key-1", name: input.name, keyPrefix: input.keyPrefix, quotaPerDay: 100, createdAt: new Date().toISOString() })),
    findActiveByPrefix: vi.fn(async () => null),
    consumeDailyQuota: vi.fn(async () => ({ allowed: false, requestCount: 0, quotaPerDay: 0 })),
    listForUser: vi.fn(async () => []),
    revokeForUser: vi.fn(async () => false),
  } satisfies DeveloperKeyStore;
}
