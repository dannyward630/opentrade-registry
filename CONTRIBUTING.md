# Contributing

Thanks for helping improve OpenTrade Registry.

## Development

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm registry:validate
corepack pnpm cleanliness:scan
```

## Adapter Guidelines

- Prefer official bulk downloads and APIs.
- Keep default tests fixture-based and offline.
- Preserve source URL, fetched time, caveats, raw records, and fingerprints.
- Use `redistributionStatus: "unknown"` unless source terms clearly say otherwise.
- Avoid claims that a missing record proves a license does not exist.

## Package Publishing

Packages are not published yet. Before publishing, confirm npm package-name availability, release credentials, provenance settings, and source metadata licensing.

