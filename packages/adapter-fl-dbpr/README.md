# @opentrade/adapter-fl-dbpr

This package reads Florida DBPR construction-license CSV records from local files and maps them into the OpenTrade canonical schema.

It is the first implemented adapter. It is intentionally local-file only in v0.1.

## Public Imports

```ts
import {
  FL_DBPR_CONSTRUCTION_SOURCE_ID,
  floridaDbprConstructionAdapter,
  normalizeFloridaDbprConstructionRecord,
} from "@opentrade/adapter-fl-dbpr";
```

## What It Does

- Reads local DBPR construction CSV files.
- Parses source rows into source-specific records.
- Maps known DBPR status and occupation codes.
- Preserves source URL, caveats, raw row data, and fingerprint.
- Emits warnings for unknown occupation or status codes when a record can still be normalized.

The package does not download live DBPR files yet.
