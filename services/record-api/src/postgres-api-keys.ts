import type { DeveloperKeyMetadata, DeveloperKeyStore, StoredDeveloperKey } from "./api-keys.js";
import type { SqlClient } from "./postgres.js";

export function createPostgresDeveloperKeyStore(client: SqlClient): DeveloperKeyStore {
  return {
    async insert(input) {
      const result = await client.query(`
        insert into opentrade.developer_api_keys (supabase_user_id, name, key_prefix, secret_hash)
        values ($1::uuid, $2, $3, $4)
        returning public_id::text as id, name, key_prefix, quota_per_day, created_at, last_used_at, expires_at, revoked_at
      `, [input.userId, input.name, input.keyPrefix, input.secretHash]);
      return mapMetadata(requiredRow(result.rows[0]));
    },

    async findActiveByPrefix(keyPrefix) {
      const result = await client.query(`
        select id::text, supabase_user_id::text as user_id, key_prefix, secret_hash, quota_per_day
        from opentrade.developer_api_keys
        where key_prefix = $1 and revoked_at is null and (expires_at is null or expires_at > now())
        limit 1
      `, [keyPrefix]);
      return result.rows[0] ? mapStored(result.rows[0]) : null;
    },

    async consumeDailyQuota(keyId, usageDate) {
      const result = await client.query(`
        with key_row as (
          select id, quota_per_day
          from opentrade.developer_api_keys
          where id = $1::bigint and revoked_at is null and (expires_at is null or expires_at > now())
        ), usage as (
          insert into opentrade.api_usage_daily (api_key_id, usage_date, request_count)
          select id, $2::date, 1 from key_row
          on conflict (api_key_id, usage_date) do update
          set request_count = opentrade.api_usage_daily.request_count + 1,
              updated_at = now()
          where opentrade.api_usage_daily.request_count < (select quota_per_day from key_row)
          returning request_count
        ), touched as (
          update opentrade.developer_api_keys
          set last_used_at = now()
          where id = (select id from key_row) and exists (select 1 from usage)
          returning id
        )
        select
          exists (select 1 from usage) as allowed,
          coalesce((select request_count from usage), (select request_count from opentrade.api_usage_daily where api_key_id = key_row.id and usage_date = $2::date), 0) as request_count,
          key_row.quota_per_day
        from key_row
      `, [keyId, usageDate]);
      const row = requiredRow(result.rows[0]);
      return { allowed: Boolean(row.allowed), requestCount: Number(row.request_count), quotaPerDay: Number(row.quota_per_day) };
    },

    async listForUser(userId) {
      const result = await client.query(`
        select public_id::text as id, name, key_prefix, quota_per_day, created_at, last_used_at, expires_at, revoked_at
        from opentrade.developer_api_keys
        where supabase_user_id = $1::uuid
        order by created_at desc
      `, [userId]);
      return result.rows.map(mapMetadata);
    },

    async revokeForUser(userId, keyId) {
      const result = await client.query(`
        update opentrade.developer_api_keys
        set revoked_at = coalesce(revoked_at, now())
        where public_id = $1::uuid and supabase_user_id = $2::uuid
        returning id
      `, [keyId, userId]);
      return result.rows.length === 1;
    },
  };
}

function mapMetadata(row: Record<string, unknown>): DeveloperKeyMetadata {
  return {
    id: String(row.id),
    name: String(row.name),
    keyPrefix: String(row.key_prefix),
    quotaPerDay: Number(row.quota_per_day),
    createdAt: toIso(row.created_at)!,
    lastUsedAt: toIso(row.last_used_at),
    expiresAt: toIso(row.expires_at),
    revokedAt: toIso(row.revoked_at),
  };
}

function mapStored(row: Record<string, unknown>): StoredDeveloperKey {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    keyPrefix: String(row.key_prefix),
    secretHash: Buffer.isBuffer(row.secret_hash) ? row.secret_hash : Buffer.from(row.secret_hash as Uint8Array),
    quotaPerDay: Number(row.quota_per_day),
  };
}

function requiredRow(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) throw new Error("Database did not return the requested API key row.");
  return row;
}

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("Database returned an invalid timestamp.");
  return date.toISOString();
}
