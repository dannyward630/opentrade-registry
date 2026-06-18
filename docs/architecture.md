# Architecture

OpenTrade Registry is organized around four small parts: source registry entries, adapters, a canonical schema, and local-first export tools.

## Source Registry

The source registry describes official public sources before or after an adapter exists. Each entry records jurisdiction, agency, source URL, documentation URL, access characteristics, adapter status, caveats, and redistribution status.

## Adapters

Adapters know how to read one official source and normalize raw source rows into canonical records. A bulk adapter may stream CSV, XLSX, JSON, or API records. A lookup-only adapter may query one license at a time.

## Canonical Schema

The canonical record preserves source identity, source freshness, raw record data, a stable fingerprint, license status, classifications, dates, public-record address fields, and caveats.

## CLI

The `opentrade` CLI validates source metadata, syncs local files to JSONL, and verifies one license number against a local source stream.

## Local-First Exports

v0.1 writes JSONL or safe canonical CSV and requires no database. Future packages may add SQLite and Postgres export targets.

## Browser Automation

Browser automation is optional and not part of core. Official bulk downloads and APIs are preferred. Portal automation should only live in source-specific adapter packages when it is lawful, stable, and unavoidable.
