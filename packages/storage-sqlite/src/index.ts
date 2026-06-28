import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import {
  canonicalTradeLicenseRecordSchema,
  normalizeLicenseNumber,
  type CanonicalTradeLicenseRecord,
  type TradeLicenseVerificationResult,
} from "@opentrade/core";

export const SQLITE_SCHEMA_VERSION = 3;

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
  "retained_until",
  "redacted_at",
] as const;

export type SqliteLicenseRecordColumn = (typeof SQLITE_LICENSE_RECORD_COLUMNS)[number];

export type SqliteLicenseRecordRow = Record<SqliteLicenseRecordColumn, string | null>;

export const SQLITE_SCHEMA_SQL = `
create table if not exists ${SQLITE_IMPORT_RUN_TABLE} (
  id text primary key,
  source_id text not null,
  source_url text not null,
  source_sha256 text,
  status text not null default 'running',
  started_at text not null,
  finished_at text,
  last_processed_row integer not null default 0,
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
  retained_until text,
  redacted_at text,
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
  options: { importRunId?: string | null; retainedUntil?: string | null; redactedAt?: string | null } = {},
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
    retained_until: options.retainedUntil ?? null,
    redacted_at: options.redactedAt ?? null,
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

export type SqliteCacheOpenOptions = {
  filePath?: string;
  create?: boolean;
};

export type SqliteImportOptions = {
  importRunId?: string;
  retainedUntil?: string | null;
};

export type ImportRunStatus = "running" | "completed" | "failed" | "interrupted";

export type SqliteImportRun = {
  id: string;
  sourceId: string;
  sourceUrl: string;
  sourceSha256: string | null;
  status: ImportRunStatus;
  startedAt: string;
  finishedAt: string | null;
  lastProcessedRow: number;
  rawRecordCount: number;
  normalizedRecordCount: number;
  warningCount: number;
  errorCount: number;
};

export type StartImportRunInput = Pick<SqliteImportRun, "id" | "sourceId" | "sourceUrl" | "startedAt"> & {
  sourceSha256?: string | null;
};

export type ImportRunCheckpoint = Pick<
  SqliteImportRun,
  "lastProcessedRow" | "rawRecordCount" | "normalizedRecordCount" | "warningCount" | "errorCount"
>;

export type RedactionOptions = {
  removePhone?: boolean;
  removeEmail?: boolean;
  removeWebsite?: boolean;
  removeAddressLines?: boolean;
  removePersonnel?: boolean;
};

let sqlRuntimePromise: Promise<SqlJsStatic> | undefined;

export class OpenTradeSqliteCache {
  readonly filePath: string | null;
  readonly database: Database;
  #dirty = false;
  #importTransactionCount: number | null = null;

  private constructor(database: Database, filePath: string | null) {
    this.database = database;
    this.filePath = filePath;
  }

  static async open(options: SqliteCacheOpenOptions = {}): Promise<OpenTradeSqliteCache> {
    const SQL = await getSqlRuntime();
    const filePath = options.filePath && options.filePath !== ":memory:" ? resolve(options.filePath) : null;
    let bytes: Uint8Array | undefined;
    if (filePath) {
      try {
        bytes = new Uint8Array(await readFile(filePath));
      } catch (error) {
        if (!isMissingFile(error) || options.create === false) throw error;
      }
    }
    const cache = new OpenTradeSqliteCache(bytes ? new SQL.Database(bytes) : new SQL.Database(), filePath);
    cache.migrate();
    return cache;
  }

  get schemaVersion(): number {
    const result = this.database.exec("select version from opentrade_schema_version limit 1");
    return Number(result[0]?.values[0]?.[0] ?? 0);
  }

  migrate(): void {
    this.database.run("begin immediate");
    try {
      this.database.run("create table if not exists opentrade_schema_version (version integer not null)");
      const current = Number(this.database.exec("select version from opentrade_schema_version limit 1")[0]?.values[0]?.[0] ?? 0);
      if (current === 0) {
        this.database.run(SQLITE_SCHEMA_SQL);
        addColumnIfMissing(this.database, SQLITE_LICENSE_RECORD_TABLE, "retained_until", "text");
        addColumnIfMissing(this.database, SQLITE_LICENSE_RECORD_TABLE, "redacted_at", "text");
        this.database.run("delete from opentrade_schema_version");
        this.database.run("insert into opentrade_schema_version(version) values (?)", [SQLITE_SCHEMA_VERSION]);
      } else if (current === 1 || current === 2) {
        addColumnIfMissing(this.database, SQLITE_LICENSE_RECORD_TABLE, "retained_until", "text");
        addColumnIfMissing(this.database, SQLITE_LICENSE_RECORD_TABLE, "redacted_at", "text");
        addColumnIfMissing(this.database, SQLITE_IMPORT_RUN_TABLE, "source_sha256", "text");
        addColumnIfMissing(this.database, SQLITE_IMPORT_RUN_TABLE, "status", "text not null default 'running'");
        addColumnIfMissing(this.database, SQLITE_IMPORT_RUN_TABLE, "last_processed_row", "integer not null default 0");
        this.database.run("update opentrade_schema_version set version = ?", [SQLITE_SCHEMA_VERSION]);
      } else if (current > SQLITE_SCHEMA_VERSION) {
        throw new Error(`SQLite cache schema ${current} is newer than supported schema ${SQLITE_SCHEMA_VERSION}.`);
      }
      this.database.run("commit");
      this.#dirty = true;
    } catch (error) {
      this.database.run("rollback");
      throw error;
    }
  }

  importRecords(records: Iterable<CanonicalTradeLicenseRecord>, options: SqliteImportOptions = {}): number {
    this.beginImport();
    try {
      for (const record of records) this.importRecord(record, options);
      return this.commitImport();
    } catch (error) {
      this.rollbackImport();
      throw error;
    }
  }

  beginImport(): void {
    if (this.#importTransactionCount !== null) throw new Error("A SQLite cache import transaction is already active.");
    this.database.run("begin immediate");
    this.#importTransactionCount = 0;
  }

  importRecord(input: CanonicalTradeLicenseRecord, options: SqliteImportOptions = {}): void {
    if (this.#importTransactionCount === null) throw new Error("Begin a SQLite cache import transaction before importing records.");
    const record = canonicalTradeLicenseRecordSchema.parse(input);
    const row = toSqliteLicenseRecordRow(record, { importRunId: options.importRunId, retainedUntil: options.retainedUntil });
    this.database.run(buildInsertLicenseRecordSql(), buildInsertLicenseRecordValues(row));
    this.#importTransactionCount += 1;
  }

  commitImport(): number {
    if (this.#importTransactionCount === null) throw new Error("No SQLite cache import transaction is active.");
    const count = this.#importTransactionCount;
    this.database.run("commit");
    this.#importTransactionCount = null;
    this.#dirty = this.#dirty || count > 0;
    return count;
  }

  rollbackImport(): void {
    if (this.#importTransactionCount === null) return;
    this.database.run("rollback");
    this.#importTransactionCount = null;
  }

  startImportRun(input: StartImportRunInput): void {
    this.database.run(
      `insert into ${SQLITE_IMPORT_RUN_TABLE} (
        id, source_id, source_url, source_sha256, status, started_at, finished_at,
        last_processed_row, raw_count, normalized_count, warning_count, error_count
      ) values (?, ?, ?, ?, 'running', ?, null, 0, 0, 0, 0, 0)
      on conflict(id) do update set
        source_id = excluded.source_id,
        source_url = excluded.source_url,
        source_sha256 = excluded.source_sha256,
        status = 'running',
        started_at = excluded.started_at,
        finished_at = null,
        last_processed_row = 0,
        raw_count = 0,
        normalized_count = 0,
        warning_count = 0,
        error_count = 0`,
      [input.id, input.sourceId, input.sourceUrl, input.sourceSha256 ?? null, input.startedAt],
    );
    this.#dirty = true;
  }

  checkpointImportRun(id: string, checkpoint: ImportRunCheckpoint): void {
    this.database.run(
      `update ${SQLITE_IMPORT_RUN_TABLE} set
        last_processed_row = ?, raw_count = ?, normalized_count = ?, warning_count = ?, error_count = ?
      where id = ?`,
      [
        checkpoint.lastProcessedRow,
        checkpoint.rawRecordCount,
        checkpoint.normalizedRecordCount,
        checkpoint.warningCount,
        checkpoint.errorCount,
        id,
      ],
    );
    if (this.database.getRowsModified() !== 1) throw new Error(`Unknown import run: ${id}`);
    this.#dirty = true;
  }

  finishImportRun(id: string, input: { status: Exclude<ImportRunStatus, "running">; finishedAt: string }): void {
    this.database.run(`update ${SQLITE_IMPORT_RUN_TABLE} set status = ?, finished_at = ? where id = ?`, [input.status, input.finishedAt, id]);
    if (this.database.getRowsModified() !== 1) throw new Error(`Unknown import run: ${id}`);
    this.#dirty = true;
  }

  getImportRun(id: string): SqliteImportRun | null {
    const statement = this.database.prepare(`select * from ${SQLITE_IMPORT_RUN_TABLE} where id = ? limit 1`);
    statement.bind([id]);
    const row = statement.step() ? statement.getAsObject() : null;
    statement.free();
    if (!row) return null;
    return {
      id: String(row.id),
      sourceId: String(row.source_id),
      sourceUrl: String(row.source_url),
      sourceSha256: row.source_sha256 == null ? null : String(row.source_sha256),
      status: String(row.status) as ImportRunStatus,
      startedAt: String(row.started_at),
      finishedAt: row.finished_at == null ? null : String(row.finished_at),
      lastProcessedRow: Number(row.last_processed_row),
      rawRecordCount: Number(row.raw_count),
      normalizedRecordCount: Number(row.normalized_count),
      warningCount: Number(row.warning_count),
      errorCount: Number(row.error_count),
    };
  }

  findByLicenseNumber(sourceId: string, licenseNumber: string): CanonicalTradeLicenseRecord[] {
    const normalized = normalizeLicenseNumber(licenseNumber);
    if (!normalized) return [];
    const statement = this.database.prepare(`select * from ${SQLITE_LICENSE_RECORD_TABLE} where source_id = ? and license_number_normalized = ? order by id`);
    statement.bind([sourceId, normalized]);
    const records: CanonicalTradeLicenseRecord[] = [];
    while (statement.step()) records.push(rowToCanonicalRecord(statement.getAsObject() as Record<string, unknown>));
    statement.free();
    return records;
  }

  verify(sourceId: string, jurisdiction: string, licenseNumber: string): TradeLicenseVerificationResult {
    const normalized = normalizeLicenseNumber(licenseNumber);
    const checkedAt = new Date().toISOString();
    if (!normalized) {
      return { sourceId, jurisdiction, query: { licenseNumber }, result: "missing_required_input", warnings: [], reasons: [{ code: "missing_license_number", message: "Missing or invalid license number." }], checkedAt };
    }
    const records = this.findByLicenseNumber(sourceId, normalized);
    if (records.length === 0) {
      return { sourceId, jurisdiction, query: { licenseNumber }, result: "not_found", warnings: [], reasons: [{ code: "no_match_in_cache", message: "No matching record was found in this local cache as of the checked time." }], checkedAt };
    }
    if (records.length > 1) {
      return { sourceId, jurisdiction, query: { licenseNumber }, result: "ambiguous", candidateRecords: records, warnings: [], reasons: [{ code: "multiple_cache_matches", message: "Multiple matching records were found in this local cache." }], checkedAt };
    }
    return { sourceId, jurisdiction, query: { licenseNumber }, result: "matched", matchedRecord: records[0], warnings: [], reasons: [], checkedAt };
  }

  redact(sourceId: string, licenseNumber: string, options: RedactionOptions = {}): number {
    const records = this.findByLicenseNumber(sourceId, licenseNumber);
    if (records.length === 0) return 0;
    const redactedAt = new Date().toISOString();
    this.database.run("begin immediate");
    try {
      for (const record of records) {
        const redacted = redactCanonicalRecord(record, options);
        const retainedUntil = this.getRetainedUntil(record.sourceId, record.raw.fingerprint);
        const row = toSqliteLicenseRecordRow(redacted, { importRunId: record.source.importRunId, retainedUntil, redactedAt });
        this.database.run(buildInsertLicenseRecordSql(), buildInsertLicenseRecordValues(row));
      }
      this.database.run("commit");
      this.#dirty = true;
      return records.length;
    } catch (error) {
      this.database.run("rollback");
      throw error;
    }
  }

  pruneExpiredRetention(asOf = new Date().toISOString()): number {
    this.database.run(`delete from ${SQLITE_LICENSE_RECORD_TABLE} where retained_until is not null and retained_until < ?`, [asOf]);
    const removed = this.database.getRowsModified();
    this.#dirty = this.#dirty || removed > 0;
    return removed;
  }

  async save(): Promise<void> {
    if (this.#importTransactionCount !== null) throw new Error("Cannot save a SQLite cache while an import transaction is active.");
    if (!this.filePath || !this.#dirty) return;
    const temporaryPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    try {
      await writeFile(temporaryPath, this.database.export());
      await rename(temporaryPath, this.filePath);
      this.#dirty = false;
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  async close(): Promise<void> {
    await this.save();
    this.database.close();
  }

  private getRetainedUntil(sourceId: string, fingerprint: string): string | null {
    const statement = this.database.prepare(`select retained_until from ${SQLITE_LICENSE_RECORD_TABLE} where source_id = ? and fingerprint = ? limit 1`);
    statement.bind([sourceId, fingerprint]);
    const retainedUntil = statement.step() ? statement.getAsObject().retained_until : null;
    statement.free();
    return retainedUntil == null ? null : String(retainedUntil);
  }
}

export function redactCanonicalRecord(record: CanonicalTradeLicenseRecord, options: RedactionOptions = {}): CanonicalTradeLicenseRecord {
  const clone = structuredClone(record);
  const settings = { removePhone: true, removeEmail: true, removeWebsite: false, removeAddressLines: true, removePersonnel: false, ...options };
  if (settings.removePhone) clone.contact.phone = null;
  if (settings.removeEmail) clone.contact.email = null;
  if (settings.removeWebsite) clone.contact.website = null;
  if (settings.removeAddressLines) {
    clone.contact.addresses = clone.contact.addresses?.map((address) => ({ ...address, line1: null, line2: null, raw: undefined }));
  }
  if (settings.removePersonnel) clone.identity.personnel = [];
  if (Object.values(settings).some(Boolean)) clone.raw.record = { redacted: true };
  return canonicalTradeLicenseRecordSchema.parse(clone);
}

async function getSqlRuntime(): Promise<SqlJsStatic> {
  if (!sqlRuntimePromise) {
    const require = createRequire(import.meta.url);
    const wasmDirectory = dirname(require.resolve("sql.js/dist/sql-wasm.js"));
    sqlRuntimePromise = initSqlJs({ locateFile: (file) => resolve(wasmDirectory, file) });
  }
  return sqlRuntimePromise;
}

function rowToCanonicalRecord(row: Record<string, unknown>): CanonicalTradeLicenseRecord {
  return canonicalTradeLicenseRecordSchema.parse({
    id: String(row.id),
    sourceId: String(row.source_id),
    jurisdiction: JSON.parse(String(row.jurisdiction_json)),
    agency: JSON.parse(String(row.agency_json)),
    source: JSON.parse(String(row.source_json)),
    license: JSON.parse(String(row.license_json)),
    identity: JSON.parse(String(row.identity_json)),
    status: JSON.parse(String(row.status_json)),
    dates: JSON.parse(String(row.dates_json)),
    contact: JSON.parse(String(row.contact_json)),
    compliance: row.compliance_json == null ? undefined : JSON.parse(String(row.compliance_json)),
    raw: { record: JSON.parse(String(row.raw_record_json)), fingerprint: String(row.fingerprint) },
  });
}

function addColumnIfMissing(database: Database, table: string, column: string, type: string): void {
  const columns = database.exec(`pragma table_info(${table})`)[0]?.values.map((row) => String(row[1])) ?? [];
  if (!columns.includes(column)) database.run(`alter table ${table} add column ${column} ${type}`);
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}
