# @opentrade/adapter-fl-dbpr

This package reads Florida DBPR construction-license CSV records from local files and maps them into the OpenTrade canonical schema.

It is the first implemented adapter. It reads local files, and the CLI can now fetch the official bulk CSV for sync or verification when users explicitly pass `--allow-network`.

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
- Carries Level 4 verification-quality metadata for neutral local-file verification semantics.

The adapter itself reads file streams. The CLI owns opt-in URL download and passes the downloaded file to the adapter.
