# @opentrade/core

Core contains the pieces that should not be tied to one state or agency: schemas, adapter contracts, normalization helpers, and verification result types.

## Public Imports

```ts
import {
  canonicalTradeLicenseRecordSchema,
  sourceRegistryEntrySchema,
  buildFingerprint,
  normalizeLicenseNumber,
  type AdapterMaturity,
  type SourceDiscoveryStatus,
  type TradeLicenseSourceAdapter,
  type CanonicalTradeLicenseRecord,
} from "@opentrade/core";
```

## What It Provides

- Canonical trade-license Zod schema.
- Source registry Zod schema.
- Source discovery, coverage scope, and adapter maturity types.
- Adapter interface and shared result types.
- Generic fingerprint, license-number, and text normalization helpers.
- Neutral verification result types.

This package does not read agency websites, write to a database, or know about any one state source.
