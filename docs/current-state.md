# Current Project State

This is the human-readable snapshot for the released `v1.0.1` line and the v2 migration now in progress. The generated [source-status matrix](source-status-matrix.md), source JSON, and repository gates are authoritative when counts drift.

## Release State

- `v1.0.1` is published on GitHub and npm.
- `11` public packages are published: core, registry orchestration, SQLite storage, CLI, and seven supported adapters.
- V1 remains the default runtime and serialization contract.
- Explicit v2 canonical, source-policy, adapter, and verification schemas are being introduced behind compatibility readers before any default changes.
- The hosted production surface remains metadata-only until the v2 record storage, privacy review, and search API are complete.

## Coverage

- `56` official source entries.
- All 50 states plus DC have researched coverage rows.
- American Samoa, Guam, Northern Mariana Islands, Puerto Rico, and the U.S. Virgin Islands have researched territory rows.
- `7` implemented adapters, all at quality Level 4.
- `2` local-file adapter outcomes.
- `5` explicit network opt-in outcomes.
- `49` terminal blocked outcomes.
- `0` provisional outcomes.
- `0` fixture-only terminal adapters.

Four sources do not expose a standalone terms URL and American Samoa does not expose a confirmed contractor-specific lookup URL. Those absences are recorded with explicit review notes and blocker evidence; they are not interpreted as permission to automate or redistribute.

## Implemented Adapters

| Source ID | Jurisdiction | Terminal capability | Input | Quality |
| --- | --- | --- | --- | --- |
| `us.az.roc.contractors` | Arizona | `network_opt_in` | dated CSV | Level 4 |
| `us.ca.cslb.contractors` | California | `local_file_adapter` | CSV/XLSX | Level 4 |
| `us.fl.dbpr.construction` | Florida | `network_opt_in` | CSV | Level 4 |
| `us.mn.dli.licenses_registrations` | Minnesota | `local_file_adapter` | CSV/XLSX | Level 4 |
| `us.or.ccb.active_licenses` | Oregon | `network_opt_in` | CSV | Level 4 |
| `us.tx.tdlr.all_licenses` | Texas | `network_opt_in` | CSV | Level 4 |
| `us.wa.lni.contractors` | Washington | `network_opt_in` | CSV | Level 4 |

Level 4 means verification language, status behavior, and source-specific caveats have been reviewed. It does not mean a source is complete, real-time, or authoritative beyond the agency record and checked time.

Alaska, Illinois, and Indiana retain private parser-research packages for historical test evidence, but the public registry marks them blocked and the CLI does not register them. Alaska access is technically controlled, Illinois lacks a validated stable public file shape, and Indiana bulk files are agreement- and payment-gated.

## Core And Orchestration

The default canonical schema, source schema, adapter contract, verification result, JSON output, and CLI exit codes carry v1 identifiers and compatibility guidance. Compatibility readers accept the prior v0.2 record and registry shapes where documented. V2 schemas add record/snapshot versions, publication and sensitivity metadata, source operating policies, source discovery, and expanded verification outcomes without silently reinterpreting v1 data.

`@opentrade-registry/registry` provides programmatic `sync()` and `verify()` orchestration for:

- local files;
- the versioned SQLite cache;
- explicitly allowed official network URLs;
- structured unsupported and blocked results.

## CLI

The CLI can:

- list, filter, show, validate, and summarize all source decisions;
- sync supported files to deterministic JSONL, safe CSV, SQLite, or multiple destinations;
- verify from a local file, SQLite cache, or explicit official URL;
- isolate malformed normalization rows unless strict mode is requested;
- report matched, not-found, ambiguous, invalid-input, unsupported, and unavailable outcomes without making licensing accusations.

Exit codes remain `0` success, `1` general error, `2` invalid or unsupported input, `3` source unavailable or network consent missing, `4` no match, `5` ambiguous match, and `6` validation failure.

## Storage

`@opentrade-registry/storage-sqlite` is a working Node 20-compatible SQLite cache. It includes:

- versioned migrations;
- transactions and indexed normalized-license lookup;
- atomic file persistence;
- canonical record reconstruction;
- cache verification semantics;
- retention pruning;
- configurable contact/address/personnel redaction.

The cache remains local. It is not uploaded to the optional hosted metadata service.

## Ingestion And Security

- CSV quoting is strict and property-tested.
- XLSX input is preflighted for compressed size, uncompressed size, entry count, compression ratio, and unsafe archive paths.
- Network downloads enforce explicit consent, HTTPS, declared hosts, redirect limits, timeouts, cancellation, byte ceilings, and SHA-256 metadata.
- JSONL/CSV replacement is atomic.
- CSV exports neutralize spreadsheet formula prefixes.
- Large-file streaming is tested with 25,000 generated rows and a 128 MiB heap-growth ceiling.
- Dependency audit currently reports no known vulnerabilities.
- CI covers Node 20/22/24 on Linux, macOS, and Windows, plus dependency review and CodeQL.

## Hosted Metadata

The optional hosted surface provides:

- static status artifacts generated from registry files;
- `GET /api/sources` and single-source lookup;
- `GET /api/readiness`;
- `GET /api/health` with file/database count and metadata parity;
- API version identifiers, public-read CORS, bounded cache headers, sanitized errors, and `nosniff`.

Supabase is an optional metadata mirror. The API falls back to checked-in files when database configuration is absent or unavailable. No imported license records or generated datasets are stored there.

## Verification Evidence

Refresh the snapshot with:

```bash
corepack pnpm source:matrix
corepack pnpm source:quality
corepack pnpm coverage:health
corepack pnpm verify
corepack pnpm pack:check
corepack pnpm security:audit
```
