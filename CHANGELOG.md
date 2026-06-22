# Changelog

## 0.2.0

- Expanded the researched source registry to 34 official state and district source entries.
- Added fixture adapters for Oregon CCB, Texas TDLR, and Washington L&I.
- Added opt-in Florida DBPR URL sync guarded by `--allow-network`.
- Added adapter conformance and Level 4 verification-semantics tests for all implemented adapters.
- Added optional hosted source metadata APIs with registry-file fallback when Supabase is absent.
- Added source quality, seed consistency, cleanliness, file hygiene, and package dry-run checks.

## 0.1.0

- Added the initial TypeScript workspace.
- Added core canonical license and source registry schemas.
- Added Florida DBPR local-file adapter with fixture coverage.
- Added CLI commands for source metadata, local sync, and local verification.
- Added public documentation and data-use caveats.
