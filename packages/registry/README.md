# `@opentrade-registry/registry`

Programmatic orchestration for OpenTrade Registry adapters.

```ts
import { OpenTradeRegistry } from "@opentrade-registry/registry";
import { floridaDbprConstructionAdapter } from "@opentrade-registry/adapter-fl-dbpr";

const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
const result = await registry.verify({
  sourceId: "us.fl.dbpr.construction",
  licenseNumber: "CGC1234567",
  input: { mode: "file", filePath: "licenses.csv" },
});
```

File and cache access are local by default. Network access requires `mode: "network"` and `allowNetwork: true`; downloads enforce HTTPS, declared official hosts, redirect limits, timeouts, byte limits, cancellation, and SHA-256 provenance. Snapshot resolvers derive reviewed direct, Socrata, dated-link, and archive URLs from source metadata without relaxing those controls.

For a supported source, omit `url` to resolve the registered official snapshot. Supplying `url` remains available as an allowlisted override.

Unsupported and blocked sources return structured results. A `not_found` result means only that no matching record appeared in the checked source or cache at the checked time.
