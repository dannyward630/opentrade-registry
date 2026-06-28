# @opentrade-registry/adapter-ca-cslb

Local-file adapter for California Contractors State License Board license-master records.

Current support is intentionally narrow:

- parses local CSV and XLSX files using the official master-license columns plus tiny hand-authored fixtures;
- normalizes master-file rows into canonical OpenTrade records;
- preserves raw records, source URL, fetched time, warnings, caveats, and fingerprints;
- supports local `sync` and `verify` through the OpenTrade CLI once registered.

The official master CSV header and representative row shape were reviewed on June 28, 2026. This package does not download CSLB files, parse companion personnel/bond/workers' compensation files, or publish generated datasets.

## Usage

```ts
import {
  CA_CSLB_CONTRACTORS_SOURCE_ID,
  californiaCslbContractorsAdapter,
} from "@opentrade-registry/adapter-ca-cslb";
```

Current maturity is `local_file_adapter`. Live CSLB portal access is not implemented; callers obtain official files themselves and retain source caveats.
