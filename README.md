# OpenTrade Registry

[![CI](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node 20+](https://img.shields.io/badge/node-%3E%3D20-43853d)
![TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6)
![Local first](https://img.shields.io/badge/data-local--first-0f766e)
![No network tests](https://img.shields.io/badge/tests-no--network--by--default-7c3aed)

OpenTrade Registry helps developers work with official contractor and skilled-trade license data from public agencies.

Contractor-license data is public, but it is scattered. One agency might publish a CSV file. Another might offer an Excel download. Another might only provide a lookup page. OpenTrade Registry gives those sources a common registry, a canonical record shape, and adapter contracts so each source can be handled consistently.

The current build is still intentionally small. It supports Florida DBPR construction-license records from local files, can opt into URL-based sync when `--allow-network` is provided, and includes fixture adapters for Oregon CCB, Texas TDLR, and Washington L&I. Normal tests do not download live agency data.

## What You Can Do Today

- Validate the source registry.
- Convert the Florida DBPR sample file into canonical records.
- Convert a tiny Oregon CCB fixture into canonical records.
- Convert a tiny Texas TDLR fixture into canonical records.
- Convert a tiny Washington L&I fixture into canonical records.
- Export canonical records as JSONL or CSV.
- Check one license number against a local source file.
- Inspect researched source metadata for Alabama, Arizona, California, Florida, Georgia, Louisiana, Michigan, Minnesota, Nevada, North Carolina, Oregon, Pennsylvania, South Carolina, Tennessee, Texas, Utah, Virginia, Washington, and Wisconsin.

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

Try the Texas TDLR fixture adapter:

```bash
corepack pnpm cli -- sync us.tx.tdlr.all_licenses \
  --file packages/adapter-tx-tdlr/fixtures/all-licenses-sample.csv \
  --out ./texas.jsonl
```

Try the Oregon CCB fixture adapter:

```bash
corepack pnpm cli -- sync us.or.ccb.active_licenses \
  --file packages/adapter-or-ccb/fixtures/active-licenses-sample.csv \
  --out ./oregon.jsonl
```

Try the Washington L&I fixture adapter:

```bash
corepack pnpm cli -- sync us.wa.lni.contractors \
  --file packages/adapter-wa-lni/fixtures/contractor-license-sample.csv \
  --out ./washington.jsonl
```

## Why Local Files First?

OpenTrade Registry starts from local files so tests stay reliable and users can inspect exactly what they are importing. URL sync is explicit: callers must pass both `--url` and `--allow-network`. Normal tests do not contact agency websites.

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

Florida DBPR is currently a local-file adapter with opt-in URL sync through the CLI. Oregon CCB, Texas TDLR, and Washington L&I are fixture-supported. Alabama General Contractors Board, Arizona ROC, California CSLB, Georgia SOS, Louisiana LSLBC, Michigan LARA, Minnesota DLI, Nevada NSCB, North Carolina NCLBGC, Pennsylvania OAG, South Carolina LLR, Tennessee Commerce, Utah DOPL, Virginia DPOR, and Wisconsin DSPS are registry-only entries.

## Project Layout

```text
packages/core               Schemas, adapter contracts, and normalization helpers
packages/adapter-fl-dbpr    Florida DBPR construction-license adapter
packages/adapter-or-ccb     Oregon CCB fixture adapter
packages/adapter-tx-tdlr    Texas TDLR fixture adapter
packages/adapter-wa-lni     Washington L&I fixture adapter
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

The next work is to make URL sync more source-aware, improve Oregon, Texas, and Washington fixture coverage, and continue building a researched source registry state by state. Broader adapter coverage will come after the registry validation, source-quality reporting, and adapter contracts stay boring and predictable.

See [docs/roadmap.md](docs/roadmap.md) for the current plan.
