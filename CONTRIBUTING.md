# Contributing

Thanks for helping improve OpenTrade Registry.

OpenTrade Registry is public-records infrastructure. Contributions should keep source attribution, caveats, and careful verification language intact.

## Development

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm registry:validate
corepack pnpm cleanliness:scan
```

## Commit Style

Keep commits small and cohesive. Prefer separate commits for metadata, docs, source registry data, adapter behavior, tests, and CLI changes.

## Adapter Guidelines

- Prefer official bulk downloads and APIs.
- Keep default tests fixture-based and offline.
- Preserve source URL, fetched time, caveats, raw records, and fingerprints.
- Use `redistributionStatus: "unknown"` unless source terms clearly say otherwise.
- Avoid claims that a missing record proves a license does not exist.
- Do not bypass CAPTCHAs, login walls, or technical access controls.
- Keep fixtures small and representative.

## Source Registry Guidelines

- Add official source URLs and documentation URLs when available.
- Use conservative unknown values when terms, coverage, or rate limits are not confirmed.
- Include known exclusions and caveats in plain language.
- Do not add generated bulk datasets.

## Package Publishing

Packages are not published yet. Before publishing, confirm npm package-name availability, release credentials, provenance settings, and source metadata licensing.
