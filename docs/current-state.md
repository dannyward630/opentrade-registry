# Current Project State

This page is a quick snapshot of what the repository supports today. It should be updated when registry coverage, adapter maturity, hosted API behavior, or release gates change.

## Source Coverage

As of the current repository state:

- `56` source registry entries are checked in.
- All `50` states plus DC have at least one researched official source entry.
- Five major U.S. territories have researched entries: American Samoa, Guam, Northern Mariana Islands, Puerto Rico, and the U.S. Virgin Islands.
- `49` sources are registry-only metadata entries.
- `7` sources have implemented adapters.
- `2` unimplemented sources are currently bulk-shaped adapter candidates according to `corepack pnpm source:quality`.
- All current source entries include the required metadata fields checked by `source:quality`: documentation, update frequency, known exclusions, rate-limit notes, public-record notes, bulk-download notes, research notes, and maintainer notes.

Registry coverage is not the same as end-to-end verification support. A registry-only source has source metadata and caveats, but it cannot be synced or checked with `opentrade verify` until an adapter exists.

## Implemented Adapters

| Source ID | Jurisdiction | Maturity | Network Behavior | Quality |
| --- | --- | --- | --- | --- |
| `us.ca.cslb.contractors` | California | `fixture_adapter` | Local fixture only by default | Level 4 |
| `us.fl.dbpr.construction` | Florida | `local_file_adapter` | CLI can use the official CSV URL only with `--allow-network` | Level 4 |
| `us.in.pla.professional_licenses` | Indiana | `fixture_adapter` | Local fixture only by default | Level 4 |
| `us.mn.dli.licenses_registrations` | Minnesota | `fixture_adapter` | Local fixture only by default | Level 4 |
| `us.or.ccb.active_licenses` | Oregon | `fixture_adapter` | Local fixture only by default | Level 4 |
| `us.tx.tdlr.all_licenses` | Texas | `fixture_adapter` | Local fixture only by default | Level 4 |
| `us.wa.lni.contractors` | Washington | `fixture_adapter` | Local fixture only by default | Level 4 |

Level 4 means the adapter has reviewed neutral verification semantics and source-specific caveats. It does not mean the source is complete, current beyond its own fetched time, or a replacement for official agency interpretation.

## CLI Capability

The CLI can:

- list, filter, show, and validate registry source metadata;
- summarize state/DC/territory coverage;
- summarize implemented adapters and bulk-shaped future candidates;
- sync implemented local-file or fixture adapters to JSONL or a narrow CSV view;
- check one license number against supported local files;
- use Florida's official DBPR CSV URL for sync or verification only when `--allow-network` is provided.

The CLI cannot sync or verify registry-only sources. Unsupported source operations return neutral wording rather than claiming anything about a contractor or license.

## Hosted Capability

The optional hosted layer provides:

- a static status page generated from the checked-in registry;
- `GET /api/health` for deployment and optional database health;
- `GET /api/sources` for source metadata;
- `GET /api/sources?id=<sourceId>` for a single source;
- `GET /api/readiness` for implemented adapter and adapter-candidate metadata.

`/api/sources` can filter by state, maturity, status, source type, quality level, implemented sources, registry-only sources, and bulk candidates. The endpoint is database-first when Supabase environment variables exist and falls back to registry files when the database is absent or unavailable.

The hosted layer does not provide a hosted verification API, background importer, account system, browser automation, or generated public-record dataset publishing.

## Optional Storage Capability

`@opentrade/storage-sqlite` provides a driverless SQLite schema and row helpers for canonical records. It is intended for applications that want a local cache while keeping OpenTrade usable without hosted services, credentials, or database setup.

The package does not include a SQLite driver, migration runner, importer, or generated dataset. Applications choose their own SQLite runtime and remain responsible for source terms, retention choices, redaction, and redistribution limits.

## Default Safety Invariants

- Normal tests do not contact agency websites.
- Network source access requires explicit opt-in.
- Generated public-record datasets are not committed.
- Source URL, checked time, caveats, raw record, and fingerprint stay attached to normalized records.
- A no-match result means: "No matching record was found in this source as of the checked time."

## Verification Commands

Use these commands to refresh this page's counts before editing public docs:

```bash
corepack pnpm source:quality -- --json
corepack pnpm coverage:health
corepack pnpm cli -- sources readiness --json
corepack pnpm cli -- sources coverage --json
```
