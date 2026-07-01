# OpenTrade Registry

[![CI](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/dannyward630/opentrade-registry/actions/workflows/ci.yml)
[![CodeQL](https://github.com/dannyward630/opentrade-registry/actions/workflows/codeql.yml/badge.svg)](https://github.com/dannyward630/opentrade-registry/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node 20, 22, 24](https://img.shields.io/badge/node-20%20%7C%2022%20%7C%2024-43853d)
![TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6)
![Local first](https://img.shields.io/badge/data-local--first-0f766e)
![Offline tests](https://img.shields.io/badge/tests-offline%20by%20default-7c3aed)

OpenTrade Registry is an open-source framework for discovering, importing, normalizing, validating, verifying, caching, and exporting official contractor and skilled-trade license records.

It is local-first, provenance-first, source-cited public-records infrastructure. It is not a marketplace, recommendation service, scoring system, or substitute for an official licensing agency.

## Released And In Development

The current stable release is [`v1.0.1`](https://github.com/dannyward630/opentrade-registry/releases/tag/v1.0.1). The current `main` development line provides the local-first CLI, programmatic orchestration, SQLite cache, nine supported adapters, and the statewide source-decision registry described below.

V2 development is underway as a sequence of focused, compatibility-tested changes. Explicit v2 canonical, source-policy, adapter, verification, and hosted API contracts are available while v1 remains the default emitter until the CLI, storage, and hosted interfaces migrate together. The repository also contains the private Postgres record schema and record API foundation; neither is a production deployment yet. The v2 target remains a nationwide search platform with board-specific inventory, automatic official snapshot resolution, versioned record history, privacy-reviewed publication, and structured manual handoffs for protected sources.

## v1 Coverage

OpenTrade Registry currently tracks `68` official sources covering all 50 states, DC, and five major U.S. territories. Every source has a terminal, evidence-backed outcome:

- `9` implemented adapters, all reviewed at adapter quality Level 4;
- `2` local-file adapters;
- `7` explicit network opt-in adapters;
- `59` blocked sources with documented legal, technical, access-control, scope, or source-stability evidence;
- `0` provisional research outcomes;
- `0` default tests that contact agency systems.

The [generated source-status matrix](docs/source-status-matrix.md) is the authoritative public source summary. The v2 [nationwide board inventory](docs/board-inventory.md) currently provides a representative-source baseline and deliberately does not claim complete board-level coverage yet.

| Source | Capability | Input |
| --- | --- | --- |
| Arizona ROC | `network_opt_in` | dated posting-list CSV |
| California CSLB | `local_file_adapter` | CSV or XLSX |
| Florida DBPR construction | `network_opt_in` | CSV |
| Florida DBPR electrical | `network_opt_in` | CSV |
| Florida DBPR asbestos | `network_opt_in` | CSV |
| Minnesota DLI | `local_file_adapter` | CSV or XLSX |
| Oregon CCB | `network_opt_in` | CSV |
| Texas TDLR | `network_opt_in` | CSV |
| Washington L&I | `network_opt_in` | CSV |

`network_opt_in` means the adapter can consume an explicitly supplied official URL with `--allow-network`. It does not mean background crawling or unrestricted portal automation.

## Safety Language

A no-match result means only:

> No matching record was found in this source as of the checked time.

It must not be rewritten as a claim that a person or business is unlicensed. Coverage, publication timing, filters, historical omissions, local licensing, and agency corrections can all affect results.

Do not publish generated datasets unless redistribution is clearly allowed. Keep source URL, fetched time, raw record, fingerprint, and caveats with every result. See [Legal and Data Use](docs/legal-and-data-use.md).

## Quickstart

Requirements: Node.js 20, 22, or 24 and Corepack.

```bash
corepack pnpm install
corepack pnpm build
```

List sources and inspect readiness:

```bash
corepack pnpm cli -- sources list
corepack pnpm cli -- sources readiness
corepack pnpm cli -- sources coverage
corepack pnpm cli -- sources show us.fl.dbpr.construction
```

Sync a fixture to canonical JSONL:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.jsonl
```

Export the safe canonical CSV view:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.csv \
  --format csv
```

Sync into a versioned local SQLite cache:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --cache ./opentrade.sqlite
```

Verify from a file or cache:

```bash
corepack pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC012345

corepack pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --cache ./opentrade.sqlite \
  --license CGC012345
```

Resolve and download the registered official source only with explicit network consent:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --allow-network \
  --out ./florida.jsonl
```

Supported resolvers use direct bulk URLs, Socrata export endpoints, dated official-file links, or bounded single-file ZIP extraction as appropriate. `--url` remains an optional override and is still restricted to declared official hosts.

Network downloads enforce HTTPS, declared official hosts, redirect limits, timeouts, byte limits, cancellation, and SHA-256 snapshot metadata. Live agency access is never required by the default test suite.

## Programmatic API

```bash
npm install @opentrade-registry/core @opentrade-registry/registry @opentrade-registry/storage-sqlite
```

```ts
import { floridaDbprConstructionAdapter } from "@opentrade-registry/adapter-fl-dbpr";
import { OpenTradeRegistry } from "@opentrade-registry/registry";
import { OpenTradeSqliteCache } from "@opentrade-registry/storage-sqlite";

const cache = await OpenTradeSqliteCache.open({ filePath: "opentrade.sqlite" });
const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);

await registry.sync({
  sourceId: "us.fl.dbpr.construction",
  input: { mode: "file", filePath: "licenses.csv" },
  cache,
});

const result = await registry.verify({
  sourceId: "us.fl.dbpr.construction",
  licenseNumber: "CGC012345",
  input: { mode: "cache" },
  cache,
});

await cache.close();
```

Public contracts expose explicit schema and API version identifiers. See [Compatibility Policy](docs/compatibility-policy.md), [v1 to v2 Migration](docs/migration-v1-to-v2.md), and [API Reference](docs/api-reference.md).

## Architecture

- `@opentrade-registry/core`: canonical schemas, source schema, adapter contracts, normalization, CSV/XLSX helpers, and compatibility identifiers.
- `@opentrade-registry/registry`: programmatic file/cache/network orchestration and hardened downloads.
- `@opentrade-registry/storage-sqlite`: versioned local SQLite cache, migrations, indexed verification, retention, and redaction.
- `@opentrade-registry/cli`: `opentrade` source, sync, export, cache, and verification commands.
- `@opentrade-registry/adapter-*`: source-specific parsers and canonical mappers.
- `registry/sources`: evidence-backed official-source metadata.
- `apps/web` and `api`: the released metadata-only hosted surface.
- `services/record-api` and `infra`: the private v2 record API, versioned Postgres schema, and local Compose foundation pending runtime deployment and recovery validation.

The local packages do not require Vercel, Supabase, Postgres, or any hosted service. The hosted layer does not store imported license records.

## Adapter Quality

Capability and review quality are separate:

- Level 0: registry metadata only.
- Level 1: a tiny fixture parses and normalizes.
- Level 2: local official-file ingestion.
- Level 3: explicit network ingestion with freshness and provenance metadata.
- Level 4: verification semantics and source caveats reviewed.

Every implemented v1 adapter is Level 4. A blocked source is also a completed research outcome when access controls, unclear terms, unstable structure, or lack of a contractor-specific source make automation indefensible.

## Development

```bash
corepack pnpm verify
corepack pnpm pack:check
corepack pnpm security:audit
corepack pnpm source:quality
corepack pnpm coverage:health
corepack pnpm db:seed:check
```

`verify` runs build, type checks, the complete offline test suite, registry validation, coverage consistency, deterministic seed and status-matrix checks, public cleanliness, and generated-file guards. `pack:check` packs every public workspace package and installs the tarballs into a clean temporary project before executing package imports and the CLI.

CI runs Node 20, 22, and 24 on Linux, macOS, and Windows. GitHub dependency review and CodeQL run separately.

## Documentation

Start with the [documentation index](docs/README.md), [current state](docs/current-state.md), [architecture](docs/architecture.md), [adapter authoring guide](docs/adapter-authoring.md), and [release process](docs/release-process.md).

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [source research template](docs/source-research-template.md) before proposing a new source or adapter.
