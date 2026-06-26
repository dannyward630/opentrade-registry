# @opentrade/adapter-ca-cslb

Fixture-first adapter for the California Contractors State License Board source registry entry.

Current support is intentionally narrow:

- parses a tiny hand-authored CSV fixture that mirrors license-master concepts;
- normalizes fixture rows into canonical OpenTrade records;
- preserves raw records, source URL, fetched time, warnings, caveats, and fingerprints;
- supports local `sync` and `verify` through the OpenTrade CLI once registered.

It does not download CSLB files, parse companion personnel/bond/workers' compensation files, or publish generated datasets.

## Usage

```ts
import {
  CA_CSLB_CONTRACTORS_SOURCE_ID,
  californiaCslbContractorsAdapter,
} from "@opentrade/adapter-ca-cslb";
```

The adapter requires a local fixture-shaped file. Live CSLB portal access is future work and must remain explicit, opt-in, and respectful of source terms.

