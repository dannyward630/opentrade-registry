# Storage

OpenTrade Registry is local-first and does not require storage. The CLI can sync supported sources to JSONL or a narrow CSV export, and the core packages can be used without credentials, hosted services, or database drivers.

Some applications still need a durable local cache. `@opentrade/storage-sqlite` is the first optional storage package for that use case.

## SQLite Package

`@opentrade/storage-sqlite` exports:

- `SQLITE_SCHEMA_SQL`
- `SQLITE_SCHEMA_VERSION`
- `SQLITE_LICENSE_RECORD_COLUMNS`
- `toSqliteLicenseRecordRow`
- `buildInsertLicenseRecordSql`
- `buildInsertLicenseRecordValues`

The package is intentionally driverless. It does not depend on `better-sqlite3`, `sqlite`, Bun SQLite, `node:sqlite`, or any other runtime. Applications choose the driver that fits their environment.

## Stored Record Shape

The SQLite row keeps lookup-friendly fields alongside JSON copies of the canonical record sections:

- source ID
- import run ID
- license number
- normalized license number
- normalized status
- fetched time
- source URL
- source record URL
- fingerprint
- raw record JSON
- canonical jurisdiction, agency, source, license, identity, status, dates, contact, and compliance JSON

The helper preserves provenance-bearing fields. It does not remove source caveats, raw records, or fingerprints.

## Boundaries

The storage package does not:

- perform live agency downloads;
- run background import jobs;
- publish generated datasets;
- replace source terms or public-record caveats;
- include retention, redaction, or access-control policy;
- provide hosted verification APIs.

Applications should still keep the neutral no-match language:

> No matching record was found in this source as of the checked time.

## Example

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

This example uses `better-sqlite3` only as an application choice. It is not a dependency of OpenTrade Registry.
