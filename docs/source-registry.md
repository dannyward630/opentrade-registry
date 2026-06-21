# Source Registry

The source registry is a catalog of official agency sources. It answers a basic question: where does the public license data come from, and what do we know about using it?

A registry entry is not the same thing as adapter support. Some entries are researched metadata only. Others have fixtures, local-file import, or future opt-in network support.

## What Goes In A Source Entry

Each entry records the agency, jurisdiction, source URL, documentation URL, source type, update notes, known exclusions, access constraints, redistribution posture, and adapter maturity.

The most important fields are:

- `id`: stable source identifier, such as `us.fl.dbpr.construction`.
- `sourceUrl`: official source or landing page.
- `officialLookupUrl`: official page for checking an individual record, when known.
- `redistributionStatus`: `unknown` unless reuse rights are clear.
- `knownExclusions`: what this source does not cover.
- `adapterStatus`: whether adapter work is planned, implemented, experimental, or deprecated.
- `adapterMaturity`: whether the source is metadata-only, fixture-backed, local-file backed, or opt-in network capable.
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

## Coverage Scope

- `statewide`: source is intended to cover a statewide licensing authority.
- `state_agency_partial`: source covers one state agency or a subset of licenses.
- `local_only`: source covers a county, city, or local authority.
- `unknown`: coverage needs more research.

## Coverage Index

`registry/us-coverage.json` tracks state-by-state progress toward broader coverage. It is intentionally high level. A state can be listed there before a detailed source entry exists.

Today, Florida DBPR is a local-file adapter with opt-in URL sync through the CLI. Oregon CCB, Texas TDLR, and Washington L&I are fixture-supported. Alabama General Contractors Board, Arkansas Contractors Licensing Board, Arizona ROC, California CSLB, Colorado DORA, Georgia SOS, Iowa DIAL, Louisiana LSLBC, Massachusetts OPSI, Michigan LARA, Minnesota DLI, Nevada NSCB, North Carolina NCLBGC, Ohio OCILB, Pennsylvania OAG, South Carolina LLR, Tennessee Commerce, Utah DOPL, Virginia DPOR, and Wisconsin DSPS are researched registry-only entries.

Minnesota, Oregon, and Washington are open-data-shaped sources. Alabama, Arkansas, Colorado, Georgia, Iowa, Louisiana, Massachusetts, Michigan, Nevada, North Carolina, Ohio, Pennsylvania, South Carolina, Tennessee, Utah, Virginia, and Wisconsin are lookup-oriented or still need bulk-export research in this phase, so their registry entries intentionally stop before parser or automation work.

## Contribution Notes

Use official agency URLs. Prefer bulk downloads and APIs over fragile page automation. Do not publish generated datasets unless the source clearly allows redistribution. When in doubt, keep the registry entry conservative and mark uncertain fields as `unknown`.
