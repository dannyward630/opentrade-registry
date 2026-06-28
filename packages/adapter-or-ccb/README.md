# @opentrade-registry/adapter-or-ccb

Network-opt-in adapter for Oregon Construction Contractors Board active-license data.

Current behavior:

- Parses tiny local CSV fixtures with official Oregon Open Data column names.
- Normalizes rows into the OpenTrade canonical license schema.
- Does not perform live downloads by itself.
- Preserves active-source caveats because the source does not claim historical or inactive coverage.
- Carries Level 4 verification-quality metadata for neutral local-file verification semantics.

Example:

```ts
import { oregonCcbActiveLicensesAdapter } from "@opentrade-registry/adapter-or-ccb";
```

Live source access remains opt-in through the CLI network path. Do not publish generated datasets unless redistribution rights and source caveats have been reviewed.
