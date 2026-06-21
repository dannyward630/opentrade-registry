# OpenTrade Registry

[![CI](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node 20+](https://img.shields.io/badge/node-%3E%3D20-43853d)
![TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6)
![Local first](https://img.shields.io/badge/data-local--first-0f766e)
![No network tests](https://img.shields.io/badge/tests-no--network--by--default-7c3aed)

OpenTrade Registry helps developers work with official contractor and skilled-trade license data from public agencies.

Contractor-license data is public, but it is scattered. One agency might publish a CSV file. Another might offer an Excel download. Another might only provide a lookup page. OpenTrade Registry gives those sources a common registry, a canonical record shape, and adapter contracts so each source can be handled consistently.

v0.1 is intentionally small. It supports Florida DBPR construction-license records from a local fixture file. It can normalize those records to JSONL or CSV and check one license number against the local file. It does not download live agency data yet.

## What You Can Do Today

- Validate the source registry.
- Convert the Florida DBPR sample file into canonical records.
- Export canonical records as JSONL or CSV.
- Check one license number against a local source file.
- Inspect researched source metadata for Florida DBPR, California CSLB, Texas TDLR, and Arizona ROC.

## What This Project Does Not Do

OpenTrade Registry stops at public-records infrastructure. It does not rank contractors, sell leads, make hiring recommendations, or replace the official licensing agency.

## Quickstart

Install dependencies from the repository root:

```bash
corepack pnpm install
```

List the registered public sources:

```bash
corepack pnpm cli -- sources list
```

Show the metadata for one source:

```bash
corepack pnpm cli -- sources show us.fl.dbpr.construction
```

Validate every source entry:

```bash
corepack pnpm cli -- sources validate
```

Turn the Florida DBPR sample fixture into canonical JSONL:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.jsonl
```

Write the same fixture as a narrow CSV export:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.csv \
  --format csv
```

Check one license number against the local fixture:

```bash
corepack pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC012345
```

## Why Local Files First?

v0.1 works from local files so tests stay reliable and users can inspect exactly what they are importing. Live agency download is planned as an explicit opt-in path later. Normal tests do not contact agency websites.

## Why Keep Source Provenance?

Each canonical record keeps the source URL, fetched time, caveats, raw record, and fingerprint. That context is important because every agency publishes different data. Some records may be missing, stale, or available only from another official source.

Do not publish generated datasets unless the source clearly allows redistribution. When in doubt, publish the code and source metadata, not the data.

## Why Not Call Someone Unlicensed?

A no-match result only means the checked source did not contain a matching record at the checked time.

Use this language:

> No matching record was found in this source as of the checked time.

Do not turn that into:

> This contractor is unlicensed.

## How Adapters Fit Together

The source registry describes official sources, even before an adapter exists. Adapters handle source-specific parsing and map records into the canonical schema. The CLI uses implemented adapters for local sync and verification.

Adapter maturity is tracked separately from source research:

- Level 0: registry metadata only.
- Level 1: fixture parses and normalizes.
- Level 2: local public file sync.
- Level 3: opt-in network sync with freshness metadata.
- Level 4: verification semantics reviewed against official source caveats.

Florida DBPR is currently the only local-file adapter. California CSLB, Texas TDLR, and Arizona ROC are registry-only entries.

## Project Layout

```text
packages/core               Schemas, adapter contracts, and normalization helpers
packages/adapter-fl-dbpr    Florida DBPR construction-license adapter
packages/cli                opentrade command-line interface
registry/sources            Source metadata for official agency sources
registry/us-coverage.json   State-by-state coverage progress
docs                        Architecture, authoring, and data-use notes
examples                    Small local-file examples
```

## Development

```bash
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
corepack pnpm registry:validate
corepack pnpm cleanliness:scan
```

## Roadmap

The next work is to harden the shared ingestion path, add opt-in Florida DBPR live-file support, and continue building a researched source registry state by state. Broader adapter coverage will come after the registry and adapter contracts stay boring and predictable.

See [docs/roadmap.md](docs/roadmap.md) for the current plan.
