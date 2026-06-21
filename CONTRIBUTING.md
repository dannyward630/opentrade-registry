# Contributing

Thanks for helping improve OpenTrade Registry.

This project is about official public records and reproducible local tooling. Good contributions keep source attribution, caveats, and careful verification language intact.

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

Keep commits small and cohesive. Separate metadata, docs, source registry data, adapter behavior, tests, and CLI changes when practical.

## Adapter Guidelines

- Prefer official bulk downloads and APIs.
- Keep default tests fixture-based and offline.
- Preserve source URL, fetched time, caveats, raw records, and fingerprints.
- Use `redistributionStatus: "unknown"` unless source terms clearly say otherwise.
- Do not imply that a missing record proves a license does not exist.
- Do not bypass CAPTCHAs, login walls, or technical access controls.
- Keep fixtures small and representative.

## Source Registry Guidelines

- Use official source and documentation URLs when available.
- Mark uncertain terms, coverage, or rate limits as `unknown`.
- Include known exclusions and caveats in plain language.
- Keep generated source exports out of the repository.

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

State coverage can start with registry metadata. A registry-only source is useful when it clearly identifies the official source and caveats.

## Package Publishing

Packages are not published yet. Before publishing, confirm npm package-name availability, release credentials, provenance settings, and source metadata licensing.
