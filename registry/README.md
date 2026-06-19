# Source Registry

The source registry catalogs official public agency sources that may contain contractor or skilled-trade license records.

## Layout

```text
registry/sources/us/<state>/<source>.json
```

Examples:

- `registry/sources/us/fl/dbpr-construction.json`
- `registry/sources/us/ca/cslb-contractors.json`

## Contribution Rules

- Use official agency URLs.
- Prefer official bulk downloads and APIs over page automation.
- Use `redistributionStatus: "unknown"` unless redistribution rights are clearly confirmed.
- Include known exclusions and public-record caveats.
- Do not add generated bulk datasets.
- Keep adapter status accurate: `planned`, `experimental`, `implemented`, or `deprecated`.

## Validation

Run:

```bash
corepack pnpm registry:validate
```

