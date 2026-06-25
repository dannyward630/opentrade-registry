import type { CanonicalTradeLicenseRecord } from "@opentrade/core";

export const SQLITE_SCHEMA_VERSION = 1;

export const SQLITE_IMPORT_RUN_TABLE = "opentrade_import_runs";
export const SQLITE_LICENSE_RECORD_TABLE = "opentrade_license_records";

export const SQLITE_LICENSE_RECORD_COLUMNS = [
  "id",
  "source_id",
  "import_run_id",
  "jurisdiction_json",
  "agency_json",
  "source_json",
  "license_json",
  "identity_json",
  "status_json",
  "dates_json",
  "contact_json",
  "compliance_json",
  "raw_record_json",
  "fingerprint",
  "license_number",
  "license_number_normalized",
  "normalized_status",
  "fetched_at",
  "source_url",
  "source_record_url",
] as const;

export type SqliteLicenseRecordColumn = (typeof SQLITE_LICENSE_RECORD_COLUMNS)[number];

export type SqliteLicenseRecordRow = Record<SqliteLicenseRecordColumn, string | null>;

export const SQLITE_SCHEMA_SQL = `
create table if not exists ${SQLITE_IMPORT_RUN_TABLE} (
  id text primary key,
  source_id text not null,
  source_url text not null,
  started_at text not null,
  finished_at text,
  output_format text,
  raw_count integer not null default 0,
  normalized_count integer not null default 0,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists ${SQLITE_LICENSE_RECORD_TABLE} (
  id text primary key,
  source_id text not null,
  import_run_id text references ${SQLITE_IMPORT_RUN_TABLE}(id) on delete set null,
  jurisdiction_json text not null,
  agency_json text not null,
  source_json text not null,
  license_json text not null,
  identity_json text not null,
  status_json text not null,
  dates_json text not null,
  contact_json text not null,
  compliance_json text,
  raw_record_json text not null,
  fingerprint text not null,
  license_number text not null,
  license_number_normalized text not null,
  normalized_status text not null,
  fetched_at text not null,
  source_url text not null,
  source_record_url text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  unique(source_id, fingerprint)
);

create index if not exists idx_opentrade_license_records_source_id
  on ${SQLITE_LICENSE_RECORD_TABLE}(source_id);

create index if not exists idx_opentrade_license_records_license_number_normalized
  on ${SQLITE_LICENSE_RECORD_TABLE}(source_id, license_number_normalized);

create index if not exists idx_opentrade_license_records_normalized_status
  on ${SQLITE_LICENSE_RECORD_TABLE}(source_id, normalized_status);

create index if not exists idx_opentrade_license_records_fetched_at
  on ${SQLITE_LICENSE_RECORD_TABLE}(source_id, fetched_at);
`.trim();

export function toSqliteLicenseRecordRow(
  record: CanonicalTradeLicenseRecord,
  options: { importRunId?: string | null } = {},
): SqliteLicenseRecordRow {
  return {
    id: record.id ?? `${record.sourceId}:${record.raw.fingerprint}`,
    source_id: record.sourceId,
    import_run_id: options.importRunId ?? record.source.importRunId ?? null,
    jurisdiction_json: stringifyJson(record.jurisdiction),
    agency_json: stringifyJson(record.agency),
    source_json: stringifyJson(record.source),
    license_json: stringifyJson(record.license),
    identity_json: stringifyJson(record.identity),
    status_json: stringifyJson(record.status),
    dates_json: stringifyJson(record.dates),
    contact_json: stringifyJson(record.contact),
    compliance_json: record.compliance === undefined ? null : stringifyJson(record.compliance),
    raw_record_json: stringifyJson(record.raw.record),
    fingerprint: record.raw.fingerprint,
    license_number: record.license.licenseNumber,
    license_number_normalized: record.license.licenseNumberNormalized,
    normalized_status: record.status.normalized,
    fetched_at: record.source.fetchedAt,
    source_url: record.source.sourceUrl,
    source_record_url: record.source.sourceRecordUrl ?? null,
  };
}

export function buildInsertLicenseRecordSql(tableName = SQLITE_LICENSE_RECORD_TABLE): string {
  assertSqlIdentifier(tableName);
  const columns = SQLITE_LICENSE_RECORD_COLUMNS.join(", ");
  const placeholders = SQLITE_LICENSE_RECORD_COLUMNS.map(() => "?").join(", ");
  const updates = SQLITE_LICENSE_RECORD_COLUMNS.filter((column) => column !== "id")
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  return `insert into ${tableName} (${columns}) values (${placeholders}) on conflict(source_id, fingerprint) do update set ${updates}`;
}

export function buildInsertLicenseRecordValues(row: SqliteLicenseRecordRow): Array<string | null> {
  return SQLITE_LICENSE_RECORD_COLUMNS.map((column) => row[column]);
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function assertSqlIdentifier(value: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQLite identifier: ${value}`);
  }
}
