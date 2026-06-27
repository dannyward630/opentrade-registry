# Programmatic API

## Core

`@opentrade/core` exports schemas, types, normalization helpers, strict CSV parsing, bounded XLSX reading, source filters, readiness summaries, and v1 compatibility identifiers.

```ts
import {
  canonicalTradeLicenseRecordSchema,
  sourceRegistryEntryV1Schema,
  normalizeLicenseNumber,
  buildFingerprint,
} from "@opentrade/core";
```

## Registry Orchestration

Construct `OpenTradeRegistry` with the adapters your application supports.

```ts
const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
```

### `sync()`

Accepts a source ID and file or explicit network input. It returns status, maturity, import stats, warnings, errors, and optional collected records. Callers can stream each normalized record through `onRecord` or persist to an `OpenTradeSqliteCache`.

Statuses are `completed`, `unsupported`, `blocked`, or `failed`. Normalization failures are isolated unless `strict` is true. Abort signals are honored between records and during downloads.

### `verify()`

Verifies a normalized license number against a file, cache, or explicit network snapshot. It returns the shared `TradeLicenseVerificationResult` shape. Unsupported and blocked sources return `source_unavailable` with structured reasons.

Network input requires `{ mode: "network", allowNetwork: true, url }`.

## SQLite

`OpenTradeSqliteCache.open()` creates or opens a cache. Public methods include `importRecords`, `findByLicenseNumber`, `verify`, `redact`, `pruneExpiredRetention`, `save`, and `close`.

## CLI JSON

`--json` responses preserve the v1 result and stats shapes. Human text is not a machine contract; scripts should use JSON output.

CLI exit codes:

| Code | Meaning |
| --- | --- |
| `0` | success |
| `1` | general error |
| `2` | invalid input or unsupported operation |
| `3` | source unavailable or network consent missing |
| `4` | no matching record in the checked source/cache |
| `5` | ambiguous match |
| `6` | registry validation failure |

## Hosted Metadata API

- `GET /api/sources`
- `GET /api/sources?id=<sourceId>`
- `GET /api/readiness`
- `GET /api/health`

Responses include `apiVersion`. Source/readiness responses are publicly cacheable for a bounded interval; health is `no-store`. The hosted API contains source metadata only and does not verify licenses.
