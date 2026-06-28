# @opentrade-registry/adapter-tx-tdlr

This package supports local files and explicit network snapshots for the official Texas TDLR All Licenses dataset shape.

The TDLR source spans many license types. This adapter keeps trade categorization conservative and does not treat every row as a contractor license.

## Public Imports

```ts
import {
  TX_TDLR_ALL_LICENSES_SOURCE_ID,
  texasTdlrAllLicensesAdapter,
  normalizeTexasTdlrRecord,
} from "@opentrade-registry/adapter-tx-tdlr";
```

## What It Does

- Reads local CSV files with TDLR All Licenses-style columns.
- Normalizes clearly understood license, business, owner, address, and expiration fields.
- Preserves source URL, caveats, raw row data, and fingerprint.
- Marks broad or unknown license types conservatively.
- Carries Level 4 verification-quality metadata for neutral local-file verification semantics.

Network access is owned by the orchestration/CLI layer and requires an explicit official URL plus `--allow-network`. Default tests remain fixture-only and offline.
