# Source Registry

The source registry catalogs official public agency sources that may contain contractor or skilled-trade license records.

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

`registry/us-coverage.json` tracks state-by-state progress toward national coverage. It is intentionally higher level than source entries and may list states before a detailed source has been researched.

## Contribution Rules

- Use official agency URLs.
- Prefer official bulk downloads and APIs over page automation.
- Use `redistributionStatus: "unknown"` unless redistribution rights are clearly confirmed.
- Include known exclusions and public-record caveats.
- Do not add generated bulk datasets.
- Keep adapter status accurate: `planned`, `experimental`, `implemented`, or `deprecated`.
- Keep adapter maturity accurate: `registry_only`, `fixture_adapter`, `local_file_adapter`, or `network_opt_in`.
- Keep generated datasets out of the registry.

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
