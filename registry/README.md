# Source Registry

The registry records official public agency sources that may contain contractor or skilled-trade license records.

## Layout

```text
registry/sources/us/<state>/<source>.json
registry/us-coverage.json
```

Examples:

- `registry/sources/us/fl/dbpr-construction.json`
- `registry/sources/us/ca/cslb-contractors.json`
- `registry/sources/us/tx/tdlr-all-licenses.json`
- `registry/sources/us/az/roc-contractors.json`
- `registry/sources/us/wa/lni-contractors.json`
- `registry/sources/us/or/ccb-active-licenses.json`
- `registry/sources/us/nv/nscb-contractors.json`
- `registry/sources/us/nc/nclbgc-general-contractors.json`
- `registry/sources/us/va/dpor-contractors.json`

`registry/us-coverage.json` tracks state-by-state progress. It may list a state before a detailed source has been researched.

## Contribution Rules

- Use official agency URLs.
- Prefer official bulk downloads and APIs over page automation.
- Use `redistributionStatus: "unknown"` unless reuse rights are clear.
- Include known exclusions and public-record caveats.
- Keep generated source exports out of the registry.
- Keep adapter status accurate: `planned`, `experimental`, `implemented`, or `deprecated`.
- Keep adapter maturity accurate: `registry_only`, `fixture_adapter`, `local_file_adapter`, or `network_opt_in`.

## Adding A State Source

1. Confirm the official agency and source URL.
2. Fill out the source research template in `docs/source-research-template.md`.
3. Add or update the source JSON under `registry/sources/us/<state>/`.
4. Update `registry/us-coverage.json`.
5. Add a tiny hand-authored fixture only when adapter work begins.
6. Keep normal tests offline.

## Validation

Run:

```bash
corepack pnpm registry:validate
```
