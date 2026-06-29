# Migrating From v1 To v2

V2 is being introduced incrementally. V1 remains the default runtime and serialization contract until the CLI, storage, orchestration, and hosted APIs can switch in one reviewed release.

## Contract Selection

Use the named identifiers and schemas when implementing v2-aware code:

```ts
import {
  OPENTRADE_V2_CANONICAL_SCHEMA_VERSION,
  canonicalTradeLicenseRecordV2Schema,
  sourceRegistryEntryV2Schema,
  tradeLicenseVerificationResultV2Schema,
} from "@opentrade-registry/core";
```

Do not infer a record schema from the npm package version. Read `schemaVersion` and validate with the matching schema.

## Canonical Records

V2 requires a stable record ID, record-version ID, source-snapshot ID, observation time, publication disposition, raw-record publication disposition, and sensitivity declaration. These fields are not inferred from v1 data because doing so could create an unsupported privacy or publication claim.

`migrateCanonicalTradeLicenseRecordV1ToV2()` validates the v1 record and requires all new review metadata. Existing raw records, fingerprints, source URLs, and fetched times are preserved.

## Source Entries

V2 source entries add automation mode, explicit allowed hosts, structured access controls, publication/privacy/retention policies, synchronization behavior, freshness thresholds, and health checks.

`migrateSourceRegistryEntryV1ToV2()` accepts only a complete v1 source and explicit v2 policies. A URL is never accepted in `allowedSourceHosts`; store hostnames without schemes or paths.

## Verification

V2 outcomes distinguish indexed matches, live matches, pending jobs, stale indexed data, manual handoffs, and unavailable sources. A v1 `matched` result must not be relabeled `live_match` unless it came from a live source observation. Neutral no-match wording remains mandatory.

## Rollout Order

1. Read and validate both versions.
2. Add v2 storage columns and backfill review metadata without changing public defaults.
3. Make orchestration and API responses version-selectable.
4. Migrate CLI output and hosted endpoints with explicit version negotiation.
5. Flip default version constants only in the v2 major release.

V1 package APIs remain supported through the documented compatibility window. Breaking removals require a major release and changelog entry.
