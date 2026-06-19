# OpenTrade Registry

[![CI](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node 20+](https://img.shields.io/badge/node-%3E%3D20-43853d)
![TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6)
![Local first](https://img.shields.io/badge/data-local--first-0f766e)
![No network tests](https://img.shields.io/badge/tests-no--network--by--default-7c3aed)

OpenTrade Registry is an open-source framework for discovering, importing, normalizing, validating, verifying, and exporting official contractor and skilled-trade license records from public agencies.

It is standalone, local-first, source-cited, provenance-first public-records infrastructure. It is not a contractor marketplace, not a review platform, not a risk scoring system, not a hosted account system, and not connected to any external product.

## Current Status

The v0.1 foundation supports Florida DBPR construction-license records from a local fixture file, normalizes them to a canonical schema, exports JSONL, and verifies one license number against that local source.

It does not download live agency data yet. Network source sync is intentionally disabled in v0.1.

## Requirements

- Node.js 20+
- pnpm

## Project Layout

```text
packages/core               Core schemas, adapter contracts, and normalization utilities
packages/adapter-fl-dbpr    Florida DBPR construction-license adapter
packages/cli                opentrade command-line interface
registry/sources            Source registry metadata
docs                        Architecture and data-use documentation
examples                    Minimal usage examples
```

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm registry:validate
```

## Quickstart

List registered sources:

```bash
pnpm cli -- sources list
```

Show one source:

```bash
pnpm cli -- sources show us.fl.dbpr.construction
```

Validate source metadata:

```bash
pnpm cli -- sources validate
```

Sync the Florida DBPR sample fixture to canonical JSONL:

```bash
pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.jsonl
```

Sync the same fixture to safe canonical CSV:

```bash
pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.csv \
  --format csv
```

Verify one license against the local fixture:

```bash
pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC012345
```

## Data-Use Warnings

OpenTrade Registry stores source URLs, fetched times, caveats, raw records, and fingerprints so downstream users can understand provenance. Generated datasets should not be published unless redistribution is clearly allowed by the source.

Use careful verification language. Correct: "No matching record was found in this source as of the checked time." Incorrect: "This contractor is unlicensed."

Source coverage varies by jurisdiction and agency. Records can be incomplete, stale, omitted, or superseded by a different official source.

Network source sync is intentionally disabled in v0.1. See `docs/florida-dbpr-url-sync.md` for the future opt-in design.
