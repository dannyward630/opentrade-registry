# @opentrade/core

Core contains the stable v1 contracts that are not tied to one state or agency: schemas, adapter contracts, compatibility identifiers, bounded parsers, normalization helpers, filters, and verification result types.

## Public Imports

```ts
import {
  canonicalTradeLicenseRecordSchema,
  sourceRegistryEntryV1Schema,
  OPENTRADE_API_VERSION,
  buildFingerprint,
  filterSources,
  buildSourceReadiness,
  getSourceResearchOutcome,
  isUnimplementedBulkAdapterCandidate,
  normalizeLicenseNumber,
  parseCsvLine,
  type AdapterMaturity,
  type SourceFilterOptions,
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
- Strict CSV parsing and bounded XLSX reading for untrusted local snapshots.
- Shared source filtering for CLI and hosted API registry views.
- Source readiness summaries for CLI/API reporting.
- Terminal source readiness and filtering helpers.
- Neutral verification result types.

This package does not read agency websites, write to a database, or know about any one state source. Network orchestration belongs to `@opentrade/registry`; persistence belongs to `@opentrade/storage-sqlite`.
