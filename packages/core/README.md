# @opentrade/core

Core schemas, adapter contracts, normalization utilities, and neutral verification types for OpenTrade Registry.

## Public Imports

```ts
import {
  canonicalTradeLicenseRecordSchema,
  sourceRegistryEntrySchema,
  buildFingerprint,
  normalizeLicenseNumber,
  type TradeLicenseSourceAdapter,
  type CanonicalTradeLicenseRecord,
} from "@opentrade/core";
```

## Contents

- Canonical trade-license Zod schema
- Source registry Zod schema
- Adapter interface and shared result types
- Generic fingerprint, license-number, and text normalization helpers
- Neutral verification result types

This package has no database dependency and performs no network access.

