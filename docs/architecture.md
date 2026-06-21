# Architecture

Official license data rarely arrives in the same shape twice. One source may be a bulk CSV. Another may be an Excel workbook. Another may only expose a lookup page. OpenTrade Registry keeps the common parts in core and leaves source-specific details inside adapters.

The project has five main pieces.

## Source Registry

The source registry is a map of official agency sources. A source can be listed before an adapter exists. That lets contributors record what is known about coverage, access rules, caveats, and redistribution uncertainty without pretending the source is already supported.

Each source entry includes the agency, jurisdiction, source URL, documentation links, access notes, adapter status, maturity level, and public-record caveats.

## Adapters

Adapters are small packages for one official source. They read raw source records, preserve the original data, and normalize each record into the canonical schema.

A bulk adapter might read CSV, XLSX, JSON, or an API response. A lookup-only adapter might check one license number at a time. In v0.1, only the Florida DBPR local-file adapter is implemented.

## Canonical Records

Canonical records give downstream code a predictable shape. They include normalized fields such as license number, status, dates, classifications, and public-record contact fields.

They also keep source details attached: source URL, fetched time, caveats, raw record, and fingerprint. The normalized view is useful, but the provenance is what lets someone understand where the record came from and how much confidence to place in it.

## CLI

The `opentrade` CLI is the first user-facing tool. It can list and validate source metadata, sync supported local files to JSONL or CSV, and check one license number against a local source file.

Registry-only sources still appear in `sources list` and `sources show`. `sync` and `verify` only work when an adapter is implemented.

## Local-First Exports

v0.1 writes files and does not require a database. That keeps the project easy to inspect and test. Future storage packages can add SQLite or Postgres without changing the core record model.

## Browser Automation

Browser automation is not part of core. Official bulk downloads and APIs should be preferred. If a source ever requires portal automation, that code should live in a source-specific adapter, stay opt-in, and respect posted access controls.
