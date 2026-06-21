# Source Registry

The source registry is a versioned catalog of official public sources. It does not imply that generated datasets can be redistributed.

Every entry includes:

- `id`
- `name`
- `jurisdiction`
- `agency`
- `sourceType`
- `sourceUrl`
- `documentationUrl`
- `dataDictionaryUrl`
- `termsUrl`
- `updateFrequency`
- `tradeCoverage`
- `licenseTypesIncluded`
- `knownExclusions`
- `hasBulkDownload`
- `hasLiveLookup`
- `requiresJavaScript`
- `requiresCaptcha`
- `requiresAccount`
- `rateLimitNotes`
- `redistributionStatus`
- `publicRecordsNotes`
- `adapterStatus`
- `sourceDiscoveryStatus`
- `adapterMaturity`
- `coverageScope`
- `adapterPackage`
- `testFixturePath`
- `officialLookupUrl`
- `officialBulkDownloadNotes`
- `researchNotes`
- `lastVerifiedAt`
- `maintainerNotes`

Use `redistributionStatus: "unknown"` unless redistribution rights are clearly confirmed.

## Discovery Status

- `needs_research`: an official source has not been confirmed.
- `researched`: official source URLs and major caveats have been checked.
- `blocked`: research found a legal, access, or technical blocker.
- `deprecated`: the source should no longer be used.

## Adapter Maturity

- `registry_only`: source metadata exists, but no parser or verifier exists.
- `fixture_adapter`: a tiny fixture can parse and normalize offline.
- `local_file_adapter`: local public files can sync without network access.
- `network_opt_in`: live source access exists and requires explicit network opt-in.

## Coverage Scope

- `statewide`: source is intended to cover a statewide licensing authority.
- `state_agency_partial`: source covers only one state agency or subset.
- `local_only`: source covers a county, city, or local authority.
- `unknown`: coverage needs more research.

The US coverage index in `registry/us-coverage.json` tracks state-by-state progress separately from individual source entries.
