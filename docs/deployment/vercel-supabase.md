# Hosted Deployment

OpenTrade Registry can be hosted as a small public status/API service while the core project remains local-first.

The hosted layer currently provides:

- A static registry status page.
- `GET /api/health` for deployment and optional database health.
- `GET /api/sources` for source registry metadata.
- `GET /api/sources?id=<sourceId>` for one source registry entry.
- `GET /api/readiness` for implemented-adapter and adapter-candidate metadata.

It does not provide live verification across every state, a hosted import worker, browser automation, account features, or generated public-record dataset publishing.

## Vercel

The root `vercel.json` builds `@opentrade/web` and serves the generated output from `apps/web/dist`.

Expected project settings:

- Framework preset: Other.
- Build command: `corepack pnpm install --frozen-lockfile && corepack pnpm --filter @opentrade/web build`.
- Output directory: `apps/web/dist`.
- Node.js: 20+.

The repository also includes root API functions under `api/`. Vercel packages `registry/**/*.json` with those functions so the source API can load source metadata at runtime.

`/api/sources` and `/api/readiness` are database-first when Supabase environment variables are configured. If the database is not configured or the database read fails, the endpoints fall back to the checked-in registry files. Responses include:

- `origin: "database"` when rows were read from Supabase.
- `origin: "registry_files"` when rows were read from the checked-in registry.
- `count` and `sources` for `/api/sources`, preserving the existing response shape.
- `implementedAdapterSources` and `unimplementedBulkAdapterCandidates` for `/api/readiness`.

Readiness candidate status is a planning signal only. It is not evidence that a source can already be imported, redistributed, or verified end to end.

`/api/health` reports the checked-in file source count and, when Supabase is configured, the database source count. The `sourceCountMatchesFiles` field should be `true` after the seed SQL has been applied.

## Supabase

The database is optional. Apply the migration in `supabase/migrations/` to create:

- `registry_sources`
- `import_runs`
- `license_records`

Set these Vercel environment variables after the project exists:

- `OPENTRADE_SUPABASE_URL`
- `OPENTRADE_SUPABASE_ANON_KEY`

The hosted health endpoint reports `database.configured: false` until those variables are set. Do not expose service role credentials to browser code.

After adding registry entries:

```bash
corepack pnpm db:seed:generate
corepack pnpm db:seed:check
```

Apply `supabase/seeds/registry_sources.sql` to the Supabase project, then confirm `/api/health` reports matching file and database source counts. Generated public-record datasets are not seeded into Supabase.

## Data-Use Guardrails

Hosted deployment does not change the source terms. Generated datasets should not be published unless redistribution is clearly allowed. Keep source URL, checked time, caveats, and fingerprints with imported records.

No-match wording remains:

> No matching record was found in this source as of the checked time.
