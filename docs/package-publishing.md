# Package Publishing

The packages are prepared for future npm publication, but they are not published yet.

## Check Package Contents

Run:

```bash
corepack pnpm pack:check
```

The dry run should show:

- `@opentrade/core`: compiled files and README.
- `@opentrade/adapter-fl-dbpr`: compiled files, README, and small fixtures.
- `@opentrade/adapter-tx-tdlr`: compiled files, README, and small fixtures.
- `@opentrade/adapter-wa-lni`: compiled files, README, and small fixtures.
- `@opentrade/cli`: compiled files and README.

Generated bulk datasets should not appear in any package.

## Publishing Guardrails

- Publish code packages, not generated public data.
- Keep source-derived datasets out unless redistribution is clearly allowed.
- Check package metadata before release: license, repository, bugs URL, homepage, engines, and keywords.
- Run `corepack pnpm verify` before publishing.
