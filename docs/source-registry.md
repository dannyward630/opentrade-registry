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
- `adapterStatus`: whether adapter work is planned, implemented, experimental, or deprecated.
- `adapterMaturity`: whether the source is metadata-only, fixture-backed, local-file backed, or opt-in network capable.
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

`registry/us-coverage.json` tracks state-by-state progress toward broader coverage. It is intentionally high level. A state can be listed there before a detailed source entry exists.

Today, Florida DBPR is a local-file adapter with opt-in URL sync through the CLI. Oregon CCB, Texas TDLR, and Washington L&I are fixture-supported. Alaska CBPL, Alabama General Contractors Board, Arkansas Contractors Licensing Board, Arizona ROC, California CSLB, Colorado DORA, Connecticut DCP, Delaware Labor, DC DLCP, Georgia SOS, Idaho DOPL, Illinois IDFPR, Indiana PLA, Iowa DIAL, Kansas Attorney General, Kentucky DHBC, Louisiana LSLBC, Maryland MHIC, Massachusetts OPSI, Michigan LARA, Minnesota DLI, Mississippi MSBOC, Nevada NSCB, New Jersey DCA, New Mexico RLD, North Carolina NCLBGC, Ohio OCILB, Pennsylvania OAG, Rhode Island CRLB, South Carolina LLR, Tennessee Commerce, Utah DOPL, Virginia DPOR, West Virginia Labor, and Wisconsin DSPS are researched registry-only entries.

Alaska, Illinois, Indiana, Minnesota, Oregon, Texas, and Washington are open-data-, download-, API-, or bulk-lookup-shaped candidates that still need source-specific terms and field review before adapter work. Alabama, Arkansas, Colorado, Connecticut, Delaware, DC, Georgia, Idaho, Iowa, Kansas, Kentucky, Louisiana, Maryland, Massachusetts, Michigan, Mississippi, Nevada, New Jersey, New Mexico, North Carolina, Ohio, Pennsylvania, Rhode Island, South Carolina, Tennessee, Utah, Virginia, West Virginia, and Wisconsin are lookup-oriented or still need bulk-export research in this phase, so their registry entries intentionally stop before parser or automation work.

## Contribution Notes

Use official agency URLs. Prefer bulk downloads and APIs over fragile page automation. Do not publish generated datasets unless the source clearly allows redistribution. When in doubt, keep the registry entry conservative and mark uncertain fields as `unknown`.
