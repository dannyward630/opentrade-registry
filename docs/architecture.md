# Architecture

Official license data rarely arrives in the same shape twice. One source may be a bulk CSV. Another may be an Excel workbook. Another may only expose a lookup page. OpenTrade Registry keeps the common parts in core and leaves source-specific details inside adapters.

The project has seven main pieces.

## Source Registry

The source registry is a map of official agency sources. A source can be listed before an adapter exists. That lets contributors record what is known about coverage, access rules, caveats, and redistribution uncertainty without pretending the source is already supported.

Each source entry includes the agency, jurisdiction, source URL, documentation links, access notes, adapter status, maturity level, and public-record caveats.

The current registry contains `56` source entries: all 50 states plus DC and five major U.S. territories have at least one researched official source entry. Most entries are intentionally registry-only until source terms, field shape, fixtures, and verification caveats have been reviewed.

## Adapters

Adapters are small packages for one official source. They read raw source records, preserve the original data, and normalize each record into the canonical schema.

A bulk adapter might read CSV, XLSX, JSON, or an API response. A lookup-only adapter might check one license number at a time. Florida DBPR has local-file support plus opt-in URL sync through the CLI, and Oregon CCB, Texas TDLR, and Washington L&I have fixture support.

## Canonical Records

Canonical records give downstream code a predictable shape. They include normalized fields such as license number, status, dates, classifications, and public-record contact fields.

They also keep source details attached: source URL, fetched time, caveats, raw record, and fingerprint. The normalized view is useful, but the provenance is what lets someone understand where the record came from and how much confidence to place in it.

## CLI

The `opentrade` CLI is the first user-facing tool. It can list and validate source metadata, sync supported local files to JSONL or CSV, and check one license number against a local source file. URL sync and URL verification are available only when callers pass `--allow-network`.

Registry-only sources still appear in `sources list` and `sources show`. `sync` and `verify` only work when an adapter is implemented.

The CLI source listing filters are backed by shared core logic, so CLI and hosted API source filters stay aligned.

## Hosted Status/API Layer

The optional hosted layer builds a static status page from the checked-in registry and exposes small API endpoints for source metadata, readiness, and health checks. `/api/sources` can filter source metadata by state, maturity, adapter status, source type, quality level, implemented sources, registry-only sources, and bulk candidates.

Hosted source endpoints are database-first when Supabase environment variables are configured and fall back to registry files when the database is absent or unavailable. The hosted layer does not run imports, perform live verification, publish generated datasets, or replace the local CLI.

## Local-First Exports

The local-first core writes files and does not require a database. That keeps the project easy to inspect and test.

`@opentrade/storage-sqlite` adds an optional local-cache path without changing that default. It exports a SQLite schema string plus helpers that turn canonical records into flat SQLite rows. It does not bundle a SQLite driver, run imports, publish generated datasets, or require credentials.

Future storage packages can add Postgres-specific helpers without changing the core record model.

## Browser Automation

Browser automation is not part of core. Official bulk downloads and APIs should be preferred. If a source ever requires portal automation, that code should live in a source-specific adapter, stay opt-in, and respect posted access controls.
