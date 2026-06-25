# @opentrade/storage-sqlite

Driverless SQLite schema and row helpers for OpenTrade Registry canonical records.

This package does not open database connections and does not depend on a SQLite runtime. It exports SQL and deterministic row helpers that can be used with `better-sqlite3`, `sqlite`, Bun SQLite, `node:sqlite`, or another driver chosen by an application.

## Exports

```ts
import {
  SQLITE_SCHEMA_SQL,
  buildInsertLicenseRecordSql,
  buildInsertLicenseRecordValues,
  toSqliteLicenseRecordRow,
} from "@opentrade/storage-sqlite";
```

## Basic Usage

```ts
import Database from "better-sqlite3";
import {
  SQLITE_SCHEMA_SQL,
  buildInsertLicenseRecordSql,
  buildInsertLicenseRecordValues,
  toSqliteLicenseRecordRow,
} from "@opentrade/storage-sqlite";

const db = new Database("opentrade.sqlite");
db.exec(SQLITE_SCHEMA_SQL);

const insert = db.prepare(buildInsertLicenseRecordSql());
const row = toSqliteLicenseRecordRow(canonicalRecord, {
  importRunId: "import-2026-06-26",
});

insert.run(...buildInsertLicenseRecordValues(row));
```

## Current Scope

The schema stores canonical license records and import-run metadata. It preserves source URL, fetched time, raw record JSON, fingerprint, caveats through the canonical `source_json`, and normalized lookup fields.

It intentionally does not include:

- a bundled SQLite driver;
- migrations beyond the initial v0.1 schema string;
- hosted sync jobs;
- generated public datasets;
- live agency network access.

Applications remain responsible for respecting source terms and for deciding whether imported records should be retained, redacted, exported, or deleted.
