# Source Registry

The registry records official public agency sources that may contain contractor or skilled-trade license records.

## Layout

```text
registry/sources/us/<jurisdiction>/<source>.json
registry/us-coverage.json
registry/us-territory-coverage.json
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
- `registry/sources/us/pa/oag-home-improvement-contractors.json`
- `registry/sources/us/wi/dsps-dwelling-trades.json`
- `registry/sources/us/ar/aclb-contractors.json`
- `registry/sources/us/oh/commerce-ocilb-contractors.json`
- `registry/sources/us/ct/dcp-home-improvement-contractors.json`
- `registry/sources/us/md/dllr-home-improvement-contractors.json`
- `registry/sources/us/nj/dca-home-improvement-contractors.json`
- `registry/sources/us/nm/rld-construction-industries.json`
- `registry/sources/us/wv/labor-contractors.json`
- `registry/sources/us/ak/commerce-construction-contractors.json`
- `registry/sources/us/de/labor-construction-contractors.json`
- `registry/sources/us/dc/dlcp-contractors.json`
- `registry/sources/us/id/dopl-contractors.json`
- `registry/sources/us/il/idfpr-roofing-contractors.json`
- `registry/sources/us/in/pla-professional-licenses.json`
- `registry/sources/us/ks/ag-roofing-registration.json`
- `registry/sources/us/ky/dhbc-trades.json`
- `registry/sources/us/ms/msboc-contractors.json`
- `registry/sources/us/ri/crlb-contractors.json`
- `registry/sources/us/hi/dcca-contractors.json`
- `registry/sources/us/me/pfr-professional-licenses.json`
- `registry/sources/us/mo/pr-professional-licenses.json`
- `registry/sources/us/mt/dli-contractor-registration.json`
- `registry/sources/us/ne/dol-contractor-registration.json`
- `registry/sources/us/nh/oplc-trades.json`
- `registry/sources/us/ny/dos-licensee-search.json`
- `registry/sources/us/nd/sos-contractors.json`
- `registry/sources/us/ok/cib-trades.json`
- `registry/sources/us/sd/dlr-plumbing.json`
- `registry/sources/us/vt/sos-residential-contractors.json`
- `registry/sources/us/wy/firemarshal-electrical.json`
- `registry/sources/us/pr/daco-contractors.json`
- `registry/sources/us/gu/clb-contractors.json`
- `registry/sources/us/vi/dlca-contractors-trades.json`

`registry/us-coverage.json` tracks state-by-state progress. It now includes all 50 states plus DC with at least one researched source entry. `registry/us-territory-coverage.json` tracks American Samoa, Guam, Northern Mariana Islands, Puerto Rico, and the U.S. Virgin Islands. Both indexes distinguish registry-only metadata from fixture, local-file, and network-capable adapters.

## Contribution Rules

- Use official agency URLs.
- Prefer official bulk downloads and APIs over page automation.
- Use `redistributionStatus: "unknown"` unless reuse rights are clear.
- Include known exclusions and public-record caveats.
- Keep generated source exports out of the registry.
- Keep adapter status accurate: `planned`, `experimental`, `implemented`, or `deprecated`.
- Keep adapter maturity accurate: `registry_only`, `fixture_adapter`, `local_file_adapter`, or `network_opt_in`.
- Keep adapter quality metadata accurate for implemented adapters. Level 4 requires reviewed verification caveats and neutral no-match language.

## Adding A State Or Territory Source

1. Confirm the official agency and source URL.
2. Fill out the source research template in `docs/source-research-template.md`.
3. Add or update the source JSON under `registry/sources/us/<jurisdiction>/`.
4. Update `registry/us-coverage.json` for states/DC or `registry/us-territory-coverage.json` for territories.
5. Add a tiny hand-authored fixture only when adapter work begins.
6. Keep normal tests offline.

## Validation

Run:

```bash
corepack pnpm registry:validate
corepack pnpm db:seed:check
```

For a quick source-quality summary, run:

```bash
corepack pnpm source:quality
```

Regenerate the optional hosted seed after changing registry entries:

```bash
corepack pnpm db:seed:generate
```
