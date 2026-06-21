# @opentrade/adapter-tx-tdlr

This package starts Texas TDLR support with a tiny fixture adapter for the official TDLR All Licenses dataset shape.

The TDLR source spans many license types. This adapter keeps trade categorization conservative and does not treat every row as a contractor license.

## Public Imports

```ts
import {
  TX_TDLR_ALL_LICENSES_SOURCE_ID,
  texasTdlrAllLicensesAdapter,
  normalizeTexasTdlrRecord,
} from "@opentrade/adapter-tx-tdlr";
```

## What It Does

- Reads local CSV files with TDLR All Licenses-style columns.
- Normalizes clearly understood license, business, owner, address, and expiration fields.
- Preserves source URL, caveats, raw row data, and fingerprint.
- Marks broad or unknown license types conservatively.

The package does not download live Texas Open Data records in v0.2.
