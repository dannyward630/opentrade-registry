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

## Verification Language

A missing match means no record was found in the checked source at the checked time. It does not prove that no license exists elsewhere.

Use:

> No matching record was found in this source as of the checked time.

Do not bypass CAPTCHAs, login walls, or technical controls.
