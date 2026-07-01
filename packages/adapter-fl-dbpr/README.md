# @opentrade-registry/adapter-fl-dbpr

This package reads Florida DBPR construction, electrical, and asbestos license CSV records and maps them into the OpenTrade canonical schema while preserving each board as a separate source.

It reads local files, and the CLI can fetch each registered official bulk CSV for sync or verification only when users explicitly pass `--allow-network`.

## Public Imports

```ts
import {
  FL_DBPR_CONSTRUCTION_SOURCE_ID,
  FL_DBPR_ELECTRICAL_SOURCE_ID,
  FL_DBPR_ASBESTOS_SOURCE_ID,
  floridaDbprConstructionAdapter,
  floridaDbprElectricalAdapter,
  floridaDbprAsbestosAdapter,
  normalizeFloridaDbprConstructionRecord,
} from "@opentrade-registry/adapter-fl-dbpr";
```

## What It Does

- Reads the documented DBPR quote/comma-delimited public-record layout.
- Keeps construction board 06, electrical board 08, and asbestos board 59 source identities distinct.
- Parses source rows into source-specific records.
- Maps known DBPR status, occupation, and trade-category codes.
- Preserves source URL, caveats, raw row data, and fingerprint.
- Emits warnings for unknown occupation or status codes when a record can still be normalized.
- Carries Level 4 verification-quality metadata for neutral local-file verification semantics.

The adapter itself reads file streams. The CLI owns opt-in URL download and passes the downloaded file to the adapter.
