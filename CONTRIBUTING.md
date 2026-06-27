# Contributing

OpenTrade Registry accepts source research, adapters, parser hardening, documentation, and local-first tooling improvements.

## Development

```bash
corepack pnpm install
corepack pnpm verify
corepack pnpm pack:check
```

Keep commits small and cohesive. Separate source evidence, adapter behavior, tests, docs, and release metadata when practical.

## Source Changes

Use [the research template](docs/source-research-template.md). Cite official URLs, preserve exclusions, keep redistribution `unknown` unless clearly established, and provide review/next-review dates. A source must end in an implemented terminal capability or an evidence-backed blocker.

Do not bypass CAPTCHAs, login walls, paywalls, accounts, or technical controls. Do not commit copied bulk rows; use tiny hand-authored fixtures based on official field names.

## Adapter Changes

An implemented v1 adapter needs:

- local-file or explicit-network capability;
- parser and mapper tests for quoted, blank, malformed, duplicate, date, status, and unknown values;
- canonical validation, raw record, fingerprint, source URL, fetched time, warnings, and caveats;
- matched, not-found, ambiguous, and invalid-input verification tests;
- shared conformance and Level 4 review coverage;
- no live network requirement in default tests.

## Pull Requests

Explain source scope and caveats, list commands run, and confirm no generated dataset was added. All required CI and security checks must pass. Contract changes need migration and changelog updates.

See [maintainer responsibilities](docs/maintainers.md) and the [release process](docs/release-process.md).
