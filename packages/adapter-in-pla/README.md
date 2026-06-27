# @opentrade/adapter-in-pla

Local-file adapter for Indiana Professional Licensing Agency MyLicense / license-download-shaped records.

This package is intentionally conservative:

- it reads local CSV files only;
- it does not call MyLicense, paid download services, or verification APIs;
- it uses a tiny hand-authored fixture, not copied agency bulk data;
- it preserves raw rows, fingerprints, source URL, fetched time, warnings, and source caveats.

```ts
import { indianaPlaProfessionalLicensesAdapter } from "@opentrade/adapter-in-pla";
```

Current maturity is `local_file_adapter`. Treat no-match results as limited to the checked local file and checked time.
