# Release Checklist

Use this checklist before tagging a release candidate. It is intentionally short: the goal is to prove the local-first project is coherent without depending on hosted services or live agency sites.

## Local Gate

```bash
corepack pnpm install
corepack pnpm verify
corepack pnpm pack:check
corepack pnpm source:quality
corepack pnpm security:audit
corepack pnpm audit --prod
```

`verify` is the authoritative default gate. It must pass without Supabase credentials, Vercel credentials, browser automation, live agency downloads, hidden local files, or generated public-record datasets.

## CLI Smoke Check

Run the public examples against checked-in fixtures:

```bash
corepack pnpm cli -- sources list
corepack pnpm cli -- sources validate
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.jsonl
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.csv \
  --format csv
corepack pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC012345
```

Remove `out.jsonl` and `out.csv` after manual checks. The file guard should reject those names if they are accidentally staged.

## Source And Data-Use Review

- Confirm `corepack pnpm source:quality` matches the README and source-registry docs.
- Confirm registry-only sources are not described as implemented adapters.
- Confirm fixture adapters are described as tiny fixture support, not full-source coverage.
- Confirm Florida URL sync and URL verification remain opt-in with `--url` and `--allow-network`.
- Confirm no generated public-record datasets are committed or attached to a release.
- Keep no-match wording neutral: “No matching record was found in this source as of the checked time.”

## Optional Hosted Check

Hosted deployment is optional. When maintaining the Vercel/Supabase status layer, also run:

```bash
corepack pnpm db:seed:check
corepack pnpm web:build
```

If a Supabase mirror is configured, apply the generated source seed and verify `/api/health` reports matching database and file-registry source counts. The hosted layer should remain source-metadata/status only; it is not required for CLI use or adapter development.
