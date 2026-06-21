# @opentrade/adapter-wa-lni

Fixture-first adapter for Washington State Department of Labor & Industries contractor license data.

Current behavior:

- Parses tiny local CSV fixtures with official Data.WA column names.
- Normalizes rows into the OpenTrade canonical license schema.
- Does not perform live downloads by itself.
- Treats uncertain specialties and statuses conservatively.

Example:

```ts
import { washingtonLniContractorsAdapter } from "@opentrade/adapter-wa-lni";
```

Live source access remains opt-in through the CLI network path. Do not publish generated datasets unless redistribution rights and source caveats have been reviewed.
