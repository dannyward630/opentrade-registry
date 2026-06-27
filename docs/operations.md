# Operational Runbook

## Local Sync

1. Inspect source metadata with `opentrade sources show`.
2. Obtain a file directly from the official source.
3. Record its URL and checked time.
4. Sync to JSONL, safe CSV, or SQLite.
5. Review warnings and errors before using output.
6. Keep generated records local unless redistribution is confirmed.

## Explicit Network Sync

Supply the exact official URL and `--allow-network`. A source-unavailable error is not an invitation to bypass controls. Check the official landing page for a new dated link and retry only within posted operational limits.

## Source Shape Change

Stop the import, retain the source snapshot privately, add a tiny hand-authored regression fixture, update parser/mapping/caveats, and run the adapter conformance plus full gates. Do not silently map unknown fields.

## Hosted Metadata Drift

Run:

```bash
corepack pnpm db:seed:generate
corepack pnpm db:seed:check
```

Apply the deterministic seed to Supabase, deploy, then confirm `/api/health` reports matching file/database counts and metadata. File registry truth remains available when the database is absent.

## Recovery

Exports and cache saves use atomic replacement. On interruption, remove abandoned temporary files only after confirming the destination is intact. Re-run sync from the original official snapshot; do not splice partial exports.
