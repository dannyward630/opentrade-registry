# Architecture

OpenTrade Registry separates source evidence, source-specific parsing, canonical records, orchestration, persistence, and optional hosting. Core use remains local-first and does not depend on the hosted layer.

## Data Flow

```text
official source metadata -> source registry
local file / explicit URL -> adapter raw stream -> canonical validation
canonical records         -> JSONL / safe CSV / SQLite cache
license query             -> file / cache / explicit URL -> neutral verification result
```

## Source Registry

`registry/sources` is the evidence layer. Every source records jurisdiction, agency, access mode, source and lookup URLs, terms posture, coverage limits, update notes, redistribution uncertainty, review dates, evidence URLs, terminal capability, and blocker evidence where applicable.

`registry/us-coverage.json` and `registry/us-territory-coverage.json` map jurisdiction coverage to those sources. Validation rejects missing references, state/path mismatches, duplicate IDs, inconsistent maturity, and missing fixtures for implemented local capabilities.

## Core

`@opentrade-registry/core` owns:

- canonical record and source schemas;
- adapter and verification contracts;
- contract version identifiers and compatibility readers;
- normalized text/license/fingerprint helpers;
- strict CSV parsing;
- bounded XLSX reading;
- shared source filtering and readiness summaries.

Core has no database or network requirement.

## Adapters

Each adapter is responsible for one source ID. It streams source-specific raw records, emits source-specific warnings, and maps each row into the canonical schema while preserving raw data and fingerprint.

Adapters do not own CLI output, SQLite persistence, or global network policy. A network-capable source still consumes a local temporary snapshot prepared by the orchestration downloader.

All implemented v1 adapters satisfy the shared conformance suite and Level 4 verification-semantics suite.

## Orchestration

`@opentrade-registry/registry` owns reusable `sync()` and `verify()` workflows. Callers inject adapters; the package handles local files, SQLite cache verification, explicit network snapshots, stats, warnings, normalization isolation, cancellation, and structured unsupported/blocked results.

The snapshot resolver selects a reviewed direct file, Socrata export, dated official link, or archive by source ID. The hardened downloader then validates protocol and declared hosts, follows a bounded redirect chain, limits time and bytes, writes a temporary file, and records URL, fetched time, ETag, Last-Modified, content type, content length, and SHA-256 when available. Single-file ZIP sources are extracted under compressed-size, uncompressed-size, entry-count, path, and compression-ratio limits.

## CLI

`@opentrade-registry/cli` is a thin command surface over registry metadata, adapters, exports, and storage. It owns human/JSON rendering and stable exit codes. It supports local JSONL/CSV exports and cache workflows without requiring network access.

## SQLite

`@opentrade-registry/storage-sqlite` uses a Node-compatible WASM SQLite runtime. It applies versioned migrations, imports records transactionally, persists files atomically, maintains lookup indexes, reconstructs canonical records, and exposes retention/redaction helpers.

SQLite is optional and local. No cache is sent to the hosted service.

## Hosted Surfaces

`apps/web` and `api` are the released metadata-only surface. Registry files are primary; Supabase is an optional mirror. Health compares file and database counts plus full normalized metadata.

`services/record-api` and `infra` are the unreleased private v2 foundation. They provide publication-filtered record search, structured verification, developer-key management, versioned Postgres storage, and private MinIO snapshot storage. These services remain optional and do not change local package behavior. Imported agency datasets are never stored in Supabase or Vercel.

## Browser Automation

Browser automation is not a core capability and no v1 adapter automates CAPTCHA, login, paywall, or protected portal flows. Bulk files and documented APIs are preferred. A future portal adapter must be source-specific, explicitly enabled, legally reviewed, bounded, and independently testable offline.
