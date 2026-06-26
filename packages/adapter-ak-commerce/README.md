# @opentrade/adapter-ak-commerce

Fixture adapter for Alaska Division of Corporations, Business and Professional Licensing construction-contractor-shaped records.

This package is intentionally conservative:

- it reads local CSV files only;
- it does not automate Alaska search or download pages;
- it does not bypass DataDome, CAPTCHA, JavaScript checks, or other technical controls;
- it uses a tiny hand-authored fixture, not copied agency bulk data;
- it preserves raw rows, fingerprints, source URL, fetched time, warnings, and source caveats.

```ts
import { alaskaCommerceConstructionContractorsAdapter } from "@opentrade/adapter-ak-commerce";
```

Current support is fixture-only. Treat no-match results as limited to the checked local file and checked time.
