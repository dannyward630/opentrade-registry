# Package Publishing

OpenTrade Registry packages are configured for future public npm publication but are not published yet.

## Dry-Run Packaging

Run:

```bash
corepack pnpm pack:check
```

Expected behavior:

- `@opentrade/core` includes `dist/` and `README.md`.
- `@opentrade/adapter-fl-dbpr` includes `dist/`, `README.md`, and small fixtures.
- `@opentrade/cli` includes `dist/` and `README.md`.
- No generated bulk datasets are included.

## Publishing Guardrails

- Keep generated exports out of published packages unless they are tiny test fixtures.
- Do not publish source-derived datasets unless redistribution is clearly allowed.
- Keep package metadata accurate: license, repository, bugs URL, homepage, engines, and keywords.
- Run `corepack pnpm verify` before any release.

