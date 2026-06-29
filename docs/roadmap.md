# Roadmap

## Released v1.0.1

The stable v1 line provides terminal research outcomes for 56 representative statewide and territory sources, seven Level 4 adapters, local/explicit-network ingestion, versioned SQLite caching, offline verification, hardened parsers/downloads, deterministic metadata artifacts, cross-platform CI, and 11 published packages.

V1 remains maintained for source-shape corrections, security updates, dependency updates, and compatibility fixes while v2 is built.

## V2 Contract And Inventory

- introduce explicit v2 canonical, source, adapter, and verification contracts with v1 readers;
- inventory material statewide boards separately instead of treating one representative source as complete state coverage;
- classify every board as bulk, API, permitted browser lookup, official manual handoff, blocked, or deprecated;
- record publication, privacy, retention, freshness, synchronization, health, evidence, and source-host policies;
- keep municipal licensing explicitly out of scope.

## V2 Ingestion And Storage

- resolve official snapshots automatically for the seven existing adapters where lawful and stable;
- centralize CSV, XLSX, ZIP, JSON, HTTP, manifest, checksum, warning, and schema-drift handling;
- add immutable Postgres manifests, source snapshots, canonical record versions, current-record promotion, health history, and worker jobs;
- archive compressed source snapshots in private object storage with checksum deduplication and critical-disk ingestion stops;
- keep normal CI entirely offline.

## V2 Search Product

- provide versioned source, search, record, verification-job, and developer-key APIs;
- add exact license and business-name search with jurisdiction, board, trade, status, and source filters;
- provide privacy-reviewed record fields, source freshness, caveats, provenance, and historical changes;
- use asynchronous isolated workers for permitted browser lookups and structured manual handoffs for protected sources;
- replace the metadata page with an accessible React/Vite search product while preserving local-first packages.

## V2 Operations And Release

- run self-hosted Postgres, object storage, API, and workers behind a private-by-default Docker network;
- expose only the API through Cloudflare Tunnel; keep databases and object storage unexposed;
- add threat modeling, encrypted backups, replication, restore drills, disk/worker alerts, canaries, SBOMs, and signed checksums;
- publish a migration-tested, provenance-backed `v2.0.0` only after clean installation, disaster recovery, security, and nationwide board-coverage acceptance gates pass.

Generated agency datasets, municipal licensing, rankings, recommendations, marketplaces, and protected-control bypasses remain outside the project scope.
