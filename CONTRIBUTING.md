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

## Adding A New State

1. Start with `docs/source-research-template.md`.
2. Confirm the source is official and public.
3. Add a source entry under `registry/sources/us/<state>/`.
4. Update `registry/us-coverage.json`.
5. Run `corepack pnpm registry:validate`.
6. Add a tiny fixture only when parser work begins.
7. Implement parser, mapper, normalizer, and verification behavior in a source-specific adapter package.
8. Keep network access disabled by default.
9. Add CLI smoke coverage for supported operations and unsupported registry-only behavior.
10. Run `corepack pnpm verify`.

State coverage progresses through registry metadata before adapter implementation. A registry-only source is useful when it clearly identifies the official source and caveats.

## Package Publishing

Packages are not published yet. Before publishing, confirm npm package-name availability, release credentials, provenance settings, and source metadata licensing.
