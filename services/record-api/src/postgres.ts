import type {
  LicenseSearchQuery,
  RecordRepository,
  StoredLicenseRecord,
  VerificationJob,
} from "./index.js";

export interface SqlClient {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export function createPostgresRecordRepository(client: SqlClient): RecordRepository {
  return {
    async searchLicenses(query) {
      const values: unknown[] = [];
      const where = ["current.publication_disposition = 'allowed'"];
      add(where, values, "current.license_number_normalized", "=", query.licenseNumber);
      add(where, values, "current.business_name", "ilike", query.businessName ? `%${escapeLike(query.businessName)}%` : undefined);
      add(where, values, "current.jurisdiction_state", "=", query.state);
      add(where, values, "current.source_id", "=", query.sourceId);
      add(where, values, "current.normalized_status", "=", query.status);
      if (query.trade) {
        values.push(query.trade);
        where.push(`$${values.length} = any(current.trade_categories)`);
      }
      if (query.cursor) {
        values.push(decodeCursor(query.cursor));
        where.push(`current.id > $${values.length}`);
      }
      values.push(query.limit + 1);
      const result = await client.query(`
        select
          current.id as internal_id,
          current.public_id::text as id,
          current.source_id,
          snapshot.public_id::text as source_snapshot_id,
          version.record_version,
          current.jurisdiction_state,
          current.license_number,
          current.license_number_normalized,
          current.business_name,
          current.licensee_name,
          current.normalized_status,
          current.trade_categories,
          current.observed_at,
          current.publication_disposition,
          current.sensitivity_level,
          snapshot.source_url,
          coalesce(current.canonical_record #> '{source,caveats}', '[]'::jsonb) as caveats,
          current.canonical_record
        from opentrade.current_records current
        join opentrade.record_versions version on version.id = current.record_version_id
        join opentrade.source_snapshots snapshot on snapshot.id = version.source_snapshot_id
        where ${where.join(" and ")}
        order by current.id
        limit $${values.length}
      `, values);
      const rows = result.rows;
      const hasMore = rows.length > query.limit;
      const visible = hasMore ? rows.slice(0, query.limit) : rows;
      return {
        records: visible.map(mapRecord),
        nextCursor: hasMore ? encodeCursor(Number(visible.at(-1)?.internal_id)) : null,
      };
    },

    async getLicense(id) {
      const result = await client.query(`
        select
          current.id as internal_id,
          current.public_id::text as id,
          current.source_id,
          snapshot.public_id::text as source_snapshot_id,
          version.record_version,
          current.jurisdiction_state,
          current.license_number,
          current.license_number_normalized,
          current.business_name,
          current.licensee_name,
          current.normalized_status,
          current.trade_categories,
          current.observed_at,
          current.publication_disposition,
          current.sensitivity_level,
          snapshot.source_url,
          coalesce(current.canonical_record #> '{source,caveats}', '[]'::jsonb) as caveats,
          current.canonical_record
        from opentrade.current_records current
        join opentrade.record_versions version on version.id = current.record_version_id
        join opentrade.source_snapshots snapshot on snapshot.id = version.source_snapshot_id
        where current.public_id = $1::uuid
          and current.publication_disposition = 'allowed'
        limit 1
      `, [id]);
      return result.rows[0] ? mapRecord(result.rows[0]) : null;
    },

    async enqueueVerification(input) {
      const result = await client.query(`
        insert into opentrade.worker_jobs (queue, kind, source_id, payload)
        values ('browser_lookup', 'verify_license', $1, $2::jsonb)
        returning public_id::text as id, status
      `, [input.sourceId, JSON.stringify(input)]);
      return mapJob(result.rows[0]);
    },

    async getVerificationJob(id) {
      const result = await client.query(`
        select public_id::text as id, status, result
        from opentrade.worker_jobs
        where public_id = $1::uuid and kind = 'verify_license'
        limit 1
      `, [id]);
      return result.rows[0] ? mapJob(result.rows[0]) : null;
    },
  };
}

function add(where: string[], values: unknown[], column: string, operator: "=" | "ilike", value: string | undefined): void {
  if (value === undefined) return;
  values.push(value);
  where.push(`${column} ${operator} $${values.length}${operator === "ilike" ? " escape '\\\\'" : ""}`);
}

function mapRecord(row: Record<string, unknown>): StoredLicenseRecord {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    sourceSnapshotId: String(row.source_snapshot_id),
    recordVersion: String(row.record_version),
    jurisdictionState: String(row.jurisdiction_state),
    licenseNumber: String(row.license_number),
    licenseNumberNormalized: String(row.license_number_normalized),
    businessName: nullableString(row.business_name),
    licenseeName: nullableString(row.licensee_name),
    normalizedStatus: String(row.normalized_status),
    tradeCategories: Array.isArray(row.trade_categories) ? row.trade_categories.map(String) : [],
    observedAt: toIso(row.observed_at),
    publicationDisposition: row.publication_disposition as StoredLicenseRecord["publicationDisposition"],
    sensitivityLevel: String(row.sensitivity_level),
    sourceUrl: String(row.source_url),
    caveats: Array.isArray(row.caveats) ? row.caveats.map(String) : [],
    canonicalRecord: row.canonical_record,
  };
}

function mapJob(row: Record<string, unknown> | undefined): VerificationJob {
  if (!row) throw new Error("Database did not return the verification job.");
  return { id: String(row.id), status: row.status as VerificationJob["status"], result: row.result };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function encodeCursor(id: number): string {
  return Buffer.from(String(id), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): number {
  const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid search cursor.");
  return value;
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function toIso(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("Database returned an invalid timestamp.");
  return date.toISOString();
}
