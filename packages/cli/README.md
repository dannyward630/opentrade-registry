# @opentrade/cli

The CLI is the simplest way to use OpenTrade Registry from this repository. It lists source metadata, validates the registry, syncs supported local files, and checks one license number against a local file or explicit opt-in URL snapshot.

## Commands

```bash
opentrade sources list
opentrade sources list --state CA
opentrade sources list --implemented
opentrade sources list --bulk-candidates --json
opentrade sources list --maturity registry_only --source-type bulk_xlsx
opentrade sources show us.tx.tdlr.all_licenses
opentrade sources readiness
opentrade sources coverage
opentrade sources validate
opentrade sync us.fl.dbpr.construction --file ./fixture.csv --out ./records.jsonl
opentrade sync us.fl.dbpr.construction --url <official-csv-url> --allow-network --out ./records.jsonl
opentrade sync us.or.ccb.active_licenses --file ./oregon-fixture.csv --out ./records.jsonl
opentrade sync us.tx.tdlr.all_licenses --file ./tdlr-fixture.csv --out ./records.jsonl
opentrade sync us.wa.lni.contractors --file ./wa-fixture.csv --out ./records.jsonl
opentrade sync us.fl.dbpr.construction --file ./fixture.csv --out ./records.csv --format csv
opentrade verify --source us.fl.dbpr.construction --file ./fixture.csv --license CGC012345
opentrade verify --source us.fl.dbpr.construction --url <official-csv-url> --allow-network --license CGC012345
```

Use `--json` when you need structured output. Use `--strict` for sync commands that should fail on the first row-level normalization error.

`sources list` and `sources show` include registry-only sources. `sources list` can filter by `--state`, `--maturity`, `--status`, `--source-type`, `--quality-level`, `--implemented`, `--registry-only`, and `--bulk-candidates`. `sources readiness` summarizes implemented adapters and unimplemented bulk-shaped candidates from local registry metadata. `sources coverage` summarizes state, DC, and major territory coverage index status. Candidate and coverage status are planning signals only; review source terms, fixture safety, field shape, filters, and verification caveats before implementation. `sync` and `verify` only run for sources with implemented adapters. URL sync and URL verification require `--allow-network`.

## Exit Codes

- `0`: success
- `1`: general error
- `2`: invalid input
- `3`: source unavailable or network source disabled
- `4`: no matching record in the checked source
- `5`: ambiguous match
- `6`: validation failed

The CLI does not download live agency data unless `--allow-network` is passed. URL sync and URL verification both use a temporary local file, preserve fetched source metadata when adapters normalize records, and clean up the temporary file afterward.
