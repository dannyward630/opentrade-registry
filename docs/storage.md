# Local SQLite Storage

`@opentrade/storage-sqlite` is the optional local cache for canonical records. It runs on Node 20, 22, and 24 without a native compilation step.

## Capabilities

- create or reopen a SQLite file;
- apply versioned migrations;
- import canonical records transactionally;
- upsert by source and fingerprint;
- index source, normalized license number, status, fetched time, and fingerprint;
- reconstruct and validate canonical records;
- verify one normalized license number;
- prune records by retention deadline;
- redact phone, email, website, address lines, or personnel;
- atomically persist the database file.

The low-level schema and row helpers remain exported for applications that use another SQLite driver.

## Example

```ts
import { OpenTradeSqliteCache } from "@opentrade/storage-sqlite";

const cache = await OpenTradeSqliteCache.open({ filePath: "opentrade.sqlite" });
cache.importRecords(records, {
  importRunId: "import-2026-06-27",
  retainedUntil: "2026-12-27T00:00:00.000Z",
});

const result = cache.verify("us.fl.dbpr.construction", "US-FL", "CGC012345");
cache.redact("us.fl.dbpr.construction", "CGC012345", {
  removeAddressLines: true,
  removePhone: true,
});

await cache.close();
```

The CLI exposes the same path through `sync --cache` and `verify --cache`.

## Migrations

The schema version is stored in `opentrade_schema_version`. Opening a cache applies supported forward migrations in a transaction. A cache newer than the installed package is rejected. Migration tests cover opening a v1 cache with the v2 runtime.

Back up important cache files before package upgrades. SQLite files are local derived artifacts and should not be committed.

## Privacy And Retention

Public records can still contain sensitive personal data. Choose retention deadlines, minimize fields, and use redaction when home addresses or personal contact details are unnecessary. Redaction does not alter source fingerprint or provenance.

The package does not decide whether retaining or redistributing a record is lawful. That remains a source-specific operational decision.
