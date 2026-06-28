# @opentrade-registry/storage-sqlite

Versioned SQLite cache and low-level row helpers for OpenTrade Registry canonical records.

The package includes a Node 20-compatible WASM SQLite runtime. It can create or reopen local cache files, import records transactionally, verify normalized license numbers, apply retention, redact selected personal fields, and persist changes atomically. Low-level SQL helpers remain public for applications that use another driver.

## Exports

```ts
import {
  OpenTradeSqliteCache,
} from "@opentrade-registry/storage-sqlite";
```

## Basic Usage

```ts
const cache = await OpenTradeSqliteCache.open({ filePath: "opentrade.sqlite" });
cache.importRecords([canonicalRecord], {
  importRunId: "import-2026-06-26",
});
await cache.close();
```

## Current Scope

The schema stores canonical license records and import-run metadata. It preserves source URL, fetched time, raw record JSON, fingerprint, caveats through the canonical `source_json`, and normalized lookup fields.

It intentionally does not include:

- hosted sync jobs;
- generated public datasets;
- live agency network access.

Applications remain responsible for respecting source terms and for deciding whether imported records should be retained, redacted, exported, or deleted.
