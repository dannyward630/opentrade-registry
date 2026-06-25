import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { canonicalTradeLicenseRecordSchema } from "@opentrade/core";
import {
  buildInsertLicenseRecordSql,
  buildInsertLicenseRecordValues,
  SQLITE_SCHEMA_SQL,
  toSqliteLicenseRecordRow,
} from "@opentrade/storage-sqlite";

export type SqliteCacheExampleResult = {
  schemaSql: string;
  insertSql: string;
  rows: Array<{
    sourceId: string;
    licenseNumberNormalized: string;
    fingerprint: string;
    values: Array<string | null>;
  }>;
};

export function buildSqliteCacheExample(inputPath = defaultInputPath()): SqliteCacheExampleResult {
  const lines = readFileSync(inputPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.map((line) => {
    const canonicalRecord = canonicalTradeLicenseRecordSchema.parse(JSON.parse(line));
    const sqliteRow = toSqliteLicenseRecordRow(canonicalRecord, {
      importRunId: "example-import-run",
    });

    return {
      sourceId: sqliteRow.source_id,
      licenseNumberNormalized: sqliteRow.license_number_normalized,
      fingerprint: sqliteRow.fingerprint,
      values: buildInsertLicenseRecordValues(sqliteRow),
    };
  });

  return {
    schemaSql: SQLITE_SCHEMA_SQL,
    insertSql: buildInsertLicenseRecordSql(),
    rows,
  };
}

function defaultInputPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "../basic-sync/expected/sample-record.jsonl");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = buildSqliteCacheExample(process.argv[2]);
  console.log(JSON.stringify(result, null, 2));
}
