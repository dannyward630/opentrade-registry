# OpenTrade Registry Database

This directory contains the optional hosted database schema for OpenTrade Registry.

The core packages and CLI remain local-first. A database is not required for local-file sync, registry validation, or package tests. The hosted database exists only so a deployment can expose public source metadata.

## Schema

The migration history initially created experimental hosted record tables. The v1 cleanup migration removes those empty tables and leaves:

- `registry_sources` for source registry metadata.

Row-level security is enabled and anonymous access is read-only. Seed writes are performed through trusted operational tooling. Do not expose service role credentials in a browser or checked-in file.

## Apply Locally Or Remotely

Apply the SQL in `migrations/` with your preferred Supabase workflow. Canonical license records and generated datasets remain local; the hosted database is not a record store.

Public source metadata can be seeded from `supabase/seeds/registry_sources.sql`. Regenerate that file after source registry changes:

```bash
corepack pnpm db:seed:generate
corepack pnpm db:seed:check
```

Required hosted environment variables:

- `OPENTRADE_SUPABASE_URL`
- `OPENTRADE_SUPABASE_ANON_KEY`

The hosted API deliberately uses an anonymous key for source-metadata health checks and read paths. Seed updates use separate trusted operational access.
