# Roadmap

OpenTrade Registry is early. The next releases should stay modest: make the first adapter reliable, make the registry useful, then add more sources without rushing into fragile live access.

## v0.1

- Core canonical schema.
- Source registry validation.
- Florida DBPR fixture adapter.
- JSONL and CSV export from a local file.
- Local-file license check.

## v0.2

- Registry coverage model.
- More researched state source entries.
- Better Florida DBPR local-file handling.
- Clearer import statistics and warnings.
- Opt-in design for live Florida DBPR download.

## v0.3

- California CSLB fixture adapter or Texas open-data adapter.
- Adapter quality badges.
- Shared import pipeline hardening.
- Possible SQLite cache research.

## v0.4

- First 10 state source registry entries.
- More fixture-supported adapters.
- Clear reporting for registry-only and adapter-supported sources.

## v1.0

- All-state source registry coverage.
- Stable adapter API.
- Stable canonical schema with a documented compatibility policy.
- No-network-by-default behavior preserved.

## Later

- SQLite or Postgres export packages.
- More state and local sources.
- Optional portal adapters where lawful and technically stable.
- Complaint and discipline data where the source terms, format, and caveats are understood.
