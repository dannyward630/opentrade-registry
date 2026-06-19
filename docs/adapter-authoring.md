# Adapter Authoring

An adapter implements the `TradeLicenseSourceAdapter` interface from `@opentrade/core`.

Adapters should be small, source-specific packages. Core stays generic; source quirks belong inside adapters.

Required capabilities:

- return source metadata
- check local or remote availability
- stream raw source records
- normalize each raw record into a canonical record

Optional capabilities:

- fetch remote snapshot metadata
- look up a single license if the source supports live lookup

## Expected Package Shape

```text
packages/adapter-<jurisdiction-source>/
  README.md
  package.json
  src/
    constants.ts
    parse.ts
    map.ts
    normalize.ts
    source.ts
    index.ts
  fixtures/
  tests/
```

## Adapter Rules

- Keep source-specific constants, status maps, and classification maps inside the adapter package.
- Preserve the raw source record and a stable fingerprint.
- Preserve source URL, fetched time, source freshness if known, caveats, and redistribution status.
- Emit warnings for unknown source values instead of failing the whole import when a canonical record can still be produced.
- Use ISO date strings in canonical records.
- Keep normal tests offline and fixture-based.

## Verification Language

Adapters and downstream commands must avoid overclaiming. A missing match means no record was found in the checked source at the checked time. It does not prove that no license exists elsewhere.

Adapter tests should use small fixtures and must not require network calls by default. Store raw records, fingerprints, source URL, fetched time, caveats, and source freshness when available.

Do not bypass CAPTCHAs, login walls, or technical access controls.
