# Hosted Deployment

OpenTrade Registry can be hosted as a small public status/API service while the core project remains local-first.

The hosted layer currently provides:

- A static registry status page.
- `GET /api/health` for deployment and optional database health.
- `GET /api/sources` for source registry metadata.
- `GET /api/sources?id=<sourceId>` for one source registry entry.
- `GET /api/readiness` for terminal source and implemented-adapter metadata.

It does not provide live verification across every state, a hosted import worker, browser automation, account features, or generated public-record dataset publishing.

## Vercel

The root `vercel.json` builds `@opentrade-registry/web` and serves the generated output from `apps/web/dist`.

Expected project settings:

- Framework preset: Other.
- Build command: `corepack pnpm install --frozen-lockfile && corepack pnpm --filter @opentrade-registry/web build`.
- Output directory: `apps/web/dist`.
- Node.js: 20+.

The repository also includes root API functions under `api/`. Vercel packages `registry/**/*.json` with those functions so the source API can load source metadata at runtime.

`/api/sources` and `/api/readiness` are database-first when Supabase environment variables are configured. If the database is not configured or the database read fails, the endpoints fall back to the checked-in registry files. Responses include:

- `origin: "database"` when rows were read from Supabase.
- `origin: "registry_files"` when rows were read from the checked-in registry.
- `count` and `sources` for `/api/sources`, with computed `sourceResearchOutcome` and `nextAction` fields on each source.
- `implementedAdapterSources`, blocked sources, terminal counts, and research-outcome counts for `/api/readiness`.

Every v1 readiness outcome is terminal. A blocked outcome documents why automation is not currently defensible; it is not evidence that the underlying credential does not exist.

`/api/sources` supports the same registry filters as the CLI source listing command:

- `state=CA`
- `maturity=registry_only`, `maturity=production_ready`, or another supported adapter maturity
- `status=implemented`, `status=blocked`, or another supported adapter status
- `sourceType=bulk_csv` or `source_type=bulk_csv`
- `qualityLevel=4` or `quality_level=4`
- `researchOutcome=blocked` or `research_outcome=blocked`
- `implemented=true`
- `registryOnly=true` or `registry_only=true`
- `bulkCandidates=true` or `bulk_candidates=true`

Filters apply to database-backed responses and file-registry fallback responses. The response includes a `filters` object so callers can see which filters were accepted. Invalid enum filters return `400` with `error: "invalid_filter"`.

Responses include `apiVersion`, public-read CORS, `nosniff`, and bounded public caching. Health responses use `no-store`, and database failures expose a generic code instead of infrastructure error details.

`/api/health` reports the checked-in file source count and, when Supabase is configured, the database source count plus row-level registry metadata parity. Both `sourceCountMatchesFiles` and `sourceMetadataMatchesFiles` should be `true` after the seed SQL has been applied. If metadata drifts, the health response includes `sourceMetadataMismatchCount` and a short `sourceMetadataMismatches` sample.

## Supabase

The database is optional. Apply the complete migration history in `supabase/migrations/`. The v1 end state contains only:

- `registry_sources`

The migration history removes the earlier empty hosted import and record tables. License records and import manifests remain in local files or the optional local SQLite cache.

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
