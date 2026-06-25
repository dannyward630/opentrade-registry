# SQLite Cache Example

This example shows how an application can prepare canonical OpenTrade records for a local SQLite cache without adding a SQLite driver to OpenTrade Registry itself.

It reads the tiny fixture-derived JSONL sample from `examples/basic-sync/expected/sample-record.jsonl`, validates each canonical record, converts it to the `@opentrade/storage-sqlite` row shape, and prints:

- the SQLite schema SQL;
- the insert/upsert SQL;
- value arrays ready to pass to a SQLite driver's prepared statement.

No agency website is contacted. No generated public-record dataset is committed.

## Run

From the repository root:

```bash
corepack pnpm exec tsx examples/sqlite-cache/example.ts
```

The output is JSON. Applications can adapt the same helpers to their chosen SQLite runtime.

## With A SQLite Driver

OpenTrade does not choose a driver for you. In an application, the same flow looks like this:

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
  importRunId: "example-import-run",
});

insert.run(...buildInsertLicenseRecordValues(row));
```

This example uses `better-sqlite3` only as an application-level choice. It is not an OpenTrade dependency.

## Interpretation

SQLite storage is a cache of what a source said at a checked time. It is not a new official source, and it does not change source caveats or redistribution limits.

If a lookup against a local cache finds nothing, keep the neutral wording:

> No matching record was found in this source as of the checked time.
