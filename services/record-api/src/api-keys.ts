import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type DeveloperKeyMetadata = {
  id: string;
  name: string;
  keyPrefix: string;
  quotaPerDay: number;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
};

export type StoredDeveloperKey = {
  id: string;
  userId: string;
  keyPrefix: string;
  secretHash: Buffer;
  quotaPerDay: number;
};

export interface DeveloperKeyStore {
  insert(input: { userId: string; name: string; keyPrefix: string; secretHash: Buffer }): Promise<DeveloperKeyMetadata>;
  findActiveByPrefix(keyPrefix: string): Promise<StoredDeveloperKey | null>;
  consumeDailyQuota(keyId: string, usageDate: string): Promise<{ allowed: boolean; requestCount: number; quotaPerDay: number }>;
  listForUser(userId: string): Promise<DeveloperKeyMetadata[]>;
  revokeForUser(userId: string, keyId: string): Promise<boolean>;
}

export type AuthenticatedDeveloperKey = {
  id: string;
  userId: string;
  quota: { requestCount: number; quotaPerDay: number };
};

export function createDeveloperKeyService(store: DeveloperKeyStore) {
  return {
    async create(userId: string, name: string): Promise<{ key: DeveloperKeyMetadata; rawKey: string }> {
      const normalizedName = name.trim();
      if (!normalizedName || normalizedName.length > 80) throw new ApiKeyError("invalid_name", "API key name must contain 1 to 80 characters.");
      const secret = randomBytes(32).toString("base64url");
      const keyPrefix = `otr_live_${secret.slice(0, 8)}`;
      const rawKey = `${keyPrefix}_${secret}`;
      const key = await store.insert({ userId, name: normalizedName, keyPrefix, secretHash: hashKey(rawKey) });
      return { key, rawKey };
    },

    async authenticate(rawKey: string): Promise<AuthenticatedDeveloperKey> {
      const keyPrefix = rawKey.match(/^(otr_live_[a-zA-Z0-9_-]{8})_[a-zA-Z0-9_-]+$/)?.[1];
      if (!keyPrefix) throw new ApiKeyError("invalid_api_key", "Invalid API key.");
      const stored = await store.findActiveByPrefix(keyPrefix);
      const candidateHash = hashKey(rawKey);
      const storedHash = stored?.secretHash ?? Buffer.alloc(candidateHash.length);
      if (storedHash.length !== candidateHash.length || !timingSafeEqual(storedHash, candidateHash) || !stored) {
        throw new ApiKeyError("invalid_api_key", "Invalid API key.");
      }
      const usage = await store.consumeDailyQuota(stored.id, new Date().toISOString().slice(0, 10));
      if (!usage.allowed) throw new ApiKeyError("quota_exceeded", "Daily API quota exceeded.");
      return { id: stored.id, userId: stored.userId, quota: { requestCount: usage.requestCount, quotaPerDay: usage.quotaPerDay } };
    },

    list(userId: string): Promise<DeveloperKeyMetadata[]> {
      return store.listForUser(userId);
    },

    async revoke(userId: string, keyId: string): Promise<void> {
      if (!await store.revokeForUser(userId, keyId)) throw new ApiKeyError("not_found", "API key not found.");
    },
  };
}

export class ApiKeyError extends Error {
  constructor(readonly code: "invalid_name" | "invalid_api_key" | "quota_exceeded" | "not_found", message: string) {
    super(message);
  }
}

function hashKey(rawKey: string): Buffer {
  return createHash("sha256").update(rawKey, "utf8").digest();
}
