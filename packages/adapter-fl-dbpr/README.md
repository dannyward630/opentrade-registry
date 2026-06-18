# @opentrade/adapter-fl-dbpr

Florida DBPR construction-license adapter for OpenTrade Registry.

## Public Imports

```ts
import {
  FL_DBPR_CONSTRUCTION_SOURCE_ID,
  floridaDbprConstructionAdapter,
  normalizeFloridaDbprConstructionRecord,
} from "@opentrade/adapter-fl-dbpr";
```

## v0.1 Behavior

- Reads local DBPR construction CSV files.
- Parses source rows into source-specific records.
- Normalizes records into the canonical OpenTrade schema.
- Preserves source URL, caveats, raw row data, and fingerprint.
- Emits warnings for unknown occupation or status codes without failing the import.

Network download is intentionally not enabled in v0.1.

