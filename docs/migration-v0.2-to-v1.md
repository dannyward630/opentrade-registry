# Migrating From v0.2 To v1

## Source Outcomes

Replace provisional outcome handling with the terminal v1 values: `production_ready`, `network_opt_in`, `local_file_adapter`, `blocked`, and `deprecated`. Blocked entries now carry structured blocker evidence.

## Adapter Maturity

Fixture-only maturity is no longer a valid terminal release outcome. Existing implemented adapters are local-file or explicit-network capable and Level 4 reviewed.

## CLI

Existing `sources`, file `sync`, JSONL/CSV export, and file `verify` commands remain. v1 adds SQLite destinations and cache verification:

```bash
opentrade sync <sourceId> --file <path> --cache <cache.sqlite>
opentrade verify --source <sourceId> --cache <cache.sqlite> --license <number>
```

Use `--json` for stable automation. Review unsupported and blocked results instead of assuming every registry entry is executable.

## Storage

The former driverless schema helpers remain exported. `OpenTradeSqliteCache` now provides the runtime. Opening a schema-v1 cache migrates it transactionally to schema v2.

## Network

Network use remains explicit. Redirects are now constrained to declared hosts and downloads record SHA-256 and response metadata. Applications that previously called CLI-internal download helpers should use `downloadOfficialSource` from `@opentrade/registry`.

## Parsing

Malformed CSV quotes now fail rather than being silently accepted. XLSX archives are rejected when safety ceilings are exceeded. Treat these failures as input errors and preserve the source file for investigation.
