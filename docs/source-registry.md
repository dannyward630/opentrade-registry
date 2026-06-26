# Source Registry

The source registry is a catalog of official agency sources. It answers a basic question: where does the public license data come from, and what do we know about using it?

A registry entry is not the same thing as adapter support. Some entries are researched metadata only. Others have fixtures, local-file import, or future opt-in network support.

## What Goes In A Source Entry

Each entry records the agency, jurisdiction, source URL, documentation URL, source type, update notes, known exclusions, access constraints, redistribution posture, adapter maturity, and adapter quality metadata where adapter behavior exists.

The most important fields are:

- `id`: stable source identifier, such as `us.fl.dbpr.construction`.
- `sourceUrl`: official source or landing page.
- `officialLookupUrl`: official page for checking an individual record, when known.
- `redistributionStatus`: `unknown` unless reuse rights are clear.
- `knownExclusions`: what this source does not cover.
- `adapterStatus`: whether adapter work is planned, implemented, experimental, blocked, or deprecated.
- `adapterMaturity`: whether the source is metadata-only, fixture-backed, local-file backed, opt-in network capable, production-ready, blocked, or deprecated.
- `adapterQualityLevel`: optional quality level for implemented adapter behavior, especially verification semantics.
- `verificationCaveats`: caveats that should shape local verification output and docs.
- `researchNotes`: maintainer notes about source coverage or next research steps.

## Discovery Status

- `needs_research`: no official source has been confirmed yet.
- `researched`: official source URLs and major caveats have been checked.
- `blocked`: research found a legal, access, or technical blocker.
- `deprecated`: the source should no longer be used.

## Adapter Maturity

- `registry_only`: source metadata exists, but no parser or verifier exists.
- `fixture_adapter`: a tiny fixture can parse and normalize offline.
- `local_file_adapter`: local public files can sync without network access.
- `network_opt_in`: live source access exists and requires explicit network opt-in.
- `production_ready`: the adapter is stable enough for production use, with source-specific caveats, conformance tests, and operational guidance kept current.
- `blocked`: adapter work is blocked by legal, access, data-shape, or technical constraints.
- `deprecated`: adapter support should no longer be used because the source was replaced, retired, or found unsuitable.

Do not use `production_ready` merely because tests pass. It should mean the adapter has real-world source-shape review, clear operational limits, reviewed verification semantics, and maintained documentation.

## Adapter Quality

Adapter quality is separate from maturity. A source can be fixture-backed but still have Level 4 verification semantics if its local verification language has been reviewed against known source caveats.

- Level 0: registry metadata only.
- Level 1: fixture parses and normalizes.
- Level 2: local public file sync.
- Level 3: opt-in network sync with freshness metadata.
- Level 4: verification semantics reviewed against official source caveats.

Implemented adapters should include `adapterQualityLevel: 4`, `verificationReviewedAt`, `verificationCaveats`, and `verificationNotes` before they are treated as public-ready verification paths.

## Coverage Scope

- `statewide`: source is intended to cover a statewide licensing authority.
- `state_agency_partial`: source covers one state agency or a subset of licenses.
- `local_only`: source covers a county, city, or local authority.
- `unknown`: coverage needs more research.

## Coverage Index

`registry/us-coverage.json` tracks state-by-state progress toward broader coverage. `registry/us-territory-coverage.json` tracks the same maturity statuses for major U.S. territories. Both indexes are intentionally high level. A jurisdiction can be listed there before a detailed source entry exists, although the current indexes now have at least one researched source entry for every state plus DC and for American Samoa, Guam, Northern Mariana Islands, Puerto Rico, and the U.S. Virgin Islands.

Today, Florida DBPR is a local-file adapter with opt-in URL sync and verification through the CLI. Alaska CBPL, California CSLB, Illinois IDFPR, Indiana PLA, Minnesota DLI, Oregon CCB, Texas TDLR, and Washington L&I are fixture-supported. Every other state/DC and territory source entry is registry-only until source-specific terms, fields, fixtures, and verification caveats are reviewed.

`corepack pnpm source:quality` currently reports `56` total source entries, `47` registry-only sources, `9` implemented adapter sources, and `0` unimplemented bulk-shaped candidates. That does not mean adapter expansion is finished; it means the current registry queue has no remaining source that already looks bulk/download-shaped and unimplemented. Future adapter work should begin with fresh source research or deeper review of existing lookup-only and territory entries. Guam, Puerto Rico, and the U.S. Virgin Islands have promising lookup-shaped territory sources. American Samoa and CNMI need more research because the current entries are broader business or construction-adjacent professional licensing metadata, not confirmed contractor-specific lookups. Most other registry-only entries are lookup-oriented or still need bulk-export research, so their registry entries intentionally stop before parser or automation work.

## Contribution Notes

Use official agency URLs. Prefer bulk downloads and APIs over fragile page automation. Do not publish generated datasets unless the source clearly allows redistribution. When in doubt, keep the registry entry conservative and mark uncertain fields as `unknown`.

Every researched source entry should include enough metadata for users to understand source limits without reading adapter code. The source-quality report treats these fields as required for current registry entries:

- `documentationUrl`
- `updateFrequency`
- `knownExclusions`
- `rateLimitNotes`
- `publicRecordsNotes`
- `officialBulkDownloadNotes`
- `researchNotes`
- `maintainerNotes`

`termsUrl` and `officialLookupUrl` are tracked separately because some official sources do not expose a clean standalone URL for those concepts. Missing values should remain visible in `corepack pnpm source:quality` so maintainers can improve entries as better official links are found.
