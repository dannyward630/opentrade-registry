# Adapter Authoring

Adapters are where source-specific work belongs. Core should stay generic; the adapter should know how one agency formats license numbers, statuses, dates, classifications, and caveats.

An adapter implements `TradeLicenseSourceAdapter` from `@opentrade-registry/core`.

## Start With Research

Before writing parser code, fill out the source research template. Confirm the source is official, record the lookup or bulk URLs, note access controls, and be honest about what the source does not cover.

During development a source may start as `registry_only`, but a release must finalize it as implemented, blocked, or deprecated with evidence.

## Adapter Quality Levels

- Level 0: registry metadata only.
- Level 1: fixture parses and normalizes.
- Level 2: local public file sync.
- Level 3: opt-in network sync with freshness metadata.
- Level 4: verification semantics reviewed against official source caveats.

`adapterMaturity` tracks capability. `adapterQualityLevel` tracks review depth. An implemented adapter should not be treated as a public-ready verification path until it has Level 4 metadata in the source registry: a review timestamp, source-specific verification caveats, and neutral no-match semantics.

Adapter maturity can also represent lifecycle outcomes beyond active support:

- `production_ready`: stable adapter behavior, source-shape review, documented limits, Level 4 verification semantics, and operational guidance are all current.
- `blocked`: adapter work should not proceed until a legal, access, source-shape, or technical blocker changes.
- `deprecated`: the adapter or source should no longer be used.

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
- Capture SHA-256 and final URL, validate official hosts, and enforce redirect, timeout, cancellation, and byte limits.
- Use local or mocked HTTP tests by default; live agency tests must stay opt-in.

Level 3 or lower to Level 4:

- Review the source registry caveats, known exclusions, public-record notes, and official lookup language.
- Add `adapterQualityLevel: 4`, `verificationReviewedAt`, `verificationCaveats`, and `verificationNotes`.
- Test matched, not-found, ambiguous, and invalid-input verification states.
- Preserve this no-match language: `No matching record was found in this source as of the checked time.`
- Avoid wording that implies a person or business lacks a license outside the checked source and time.

Level 4 to `production_ready`:

- Confirm the adapter handles real current source files or opt-in source access without relying only on tiny fixtures.
- Confirm source terms, redistribution posture, update cadence, and known exclusions are documented.
- Keep conformance tests, CLI smoke tests, and source-specific parser/mapping tests green.
- Document operational limits, expected warnings, and what users should do when source fields change.
- Keep generated datasets out of the repository.
- Pass clean tarball installation and package-import tests.

Any level to `blocked` or `deprecated`:

- Record a structured blocker code, summary, evidence URLs, review date, and next-review date.
- Keep the source registry entry if it helps users avoid a dead end.
- Do not let blocked or deprecated sources appear as implemented adapter candidates.

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

CSV adapters must reject malformed quoting. XLSX adapters use shared archive ceilings. Exported CSV must not expose raw JSON or spreadsheet formulas. Add cancellation and malformed-row behavior when shared orchestration changes.

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
