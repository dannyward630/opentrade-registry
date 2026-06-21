# Adapter Authoring

Adapters are where source-specific work belongs. Core should stay generic; the adapter should know how one agency formats license numbers, statuses, dates, classifications, and caveats.

An adapter implements `TradeLicenseSourceAdapter` from `@opentrade/core`.

## Start With Research

Before writing parser code, fill out the source research template. Confirm the source is official, record the lookup or bulk URLs, note access controls, and be honest about what the source does not cover.

New states should usually start as `registry_only`. Move to adapter work after the source shape and caveats are understood.

## Adapter Quality Levels

- Level 0: registry metadata only.
- Level 1: fixture parses and normalizes.
- Level 2: local public file sync.
- Level 3: opt-in network sync with freshness metadata.
- Level 4: verification semantics reviewed against official source caveats.

## Moving A Source Through The Levels

Level 0 to Level 1:

- Confirm the source is official and update the registry entry.
- Add a tiny hand-authored fixture using official column names.
- Implement parser, mapper, normalizer, and source adapter files.
- Add parser, mapping, CLI sync, CLI verify, and adapter conformance tests.

Level 1 to Level 2:

- Test against a downloaded official file shape without committing the download.
- Accept harmless column reordering and extra columns where the source format supports it.
- Keep row-level warnings and source caveats visible.
- Promote maturity only after local-file behavior is stable.

Level 2 to Level 3:

- Keep network access opt-in with `--allow-network`.
- Capture fetched time, source URL, last-modified, ETag, and content length when available.
- Use local or mocked HTTP tests by default; live agency tests must stay opt-in.

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

## What A Good Adapter Preserves

Every adapter should preserve:

- `sourceId`
- source URL
- fetched time
- source freshness when known
- caveats
- raw record
- stable fingerprint
- raw status and normalized status

Unknown source values should become warnings when the record can still be normalized safely. Do not silently drop unusual statuses or classifications.

## Testing Rules

Keep normal tests offline. Use small fixtures that exercise parsing, mapping, status normalization, warnings, and verification behavior. Do not commit bulk public datasets.

If a future adapter supports live download, network tests should be opt-in and separate from default CI.

Implemented adapters should also pass the shared adapter conformance test. That test checks metadata, availability, fixture streaming, canonical normalization, source URL preservation, and fingerprint shape across every registered adapter.

Sync should report row-level normalization errors where possible. Use `--strict` when a sync should fail on the first bad normalized record.

## Lookup-Only Sources

Some official sources only expose a lookup page or a portal. Start those as `registry_only`. Do not add browser or portal automation until source terms, technical controls, and verification caveats have been reviewed. Prefer an official bulk export or API whenever one exists.

## Verification Language

A missing match means no record was found in the checked source at the checked time. It does not prove that no license exists elsewhere.

Use:

> No matching record was found in this source as of the checked time.

Do not bypass CAPTCHAs, login walls, or technical controls.
