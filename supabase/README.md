# OpenTrade Registry Database

This directory contains the optional hosted database schema for OpenTrade Registry.

The core packages and CLI remain local-first. A database is not required for fixture sync, local-file sync, registry validation, or package tests. The hosted database exists so a deployment can expose source metadata and, later, imported public-record snapshots with provenance.

## Schema

The first migration creates:

- `registry_sources` for source registry metadata.
- `import_runs` for import provenance, counts, warnings, and source freshness metadata.
- `license_records` for canonical normalized records, raw-record fingerprints, and source metadata.

Row-level security is enabled. Public read policies are added for `registry_sources` and `license_records`; writes should be performed only from trusted server-side tooling with a service role key. Do not expose service role credentials in a browser or checked-in file.

## Apply Locally Or Remotely

Apply the SQL in `migrations/` with your preferred Supabase workflow. Generated public-record datasets should remain local unless redistribution is clearly allowed by the official source terms.

Public source metadata can be seeded from `supabase/seeds/registry_sources.sql`. Regenerate that file after source registry changes:

```bash
corepack pnpm db:seed:generate
corepack pnpm db:seed:check
```

Required hosted environment variables:

- `OPENTRADE_SUPABASE_URL`
- `OPENTRADE_SUPABASE_ANON_KEY`

The hosted API deliberately uses an anon key for health checks and read paths. Write/import jobs should use a separate trusted environment with stronger credentials.
