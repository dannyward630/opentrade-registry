# @opentrade/cli

The CLI is the simplest way to use OpenTrade Registry from this repository. It lists source metadata, validates the registry, syncs supported local files, and checks one license number against a local source file.

## Commands

```bash
opentrade sources list
opentrade sources show us.tx.tdlr.all_licenses
opentrade sources validate
opentrade sync us.fl.dbpr.construction --file ./fixture.csv --out ./records.jsonl
opentrade sync us.fl.dbpr.construction --url <official-csv-url> --allow-network --out ./records.jsonl
opentrade sync us.tx.tdlr.all_licenses --file ./tdlr-fixture.csv --out ./records.jsonl
opentrade sync us.wa.lni.contractors --file ./wa-fixture.csv --out ./records.jsonl
opentrade sync us.fl.dbpr.construction --file ./fixture.csv --out ./records.csv --format csv
opentrade verify --source us.fl.dbpr.construction --file ./fixture.csv --license CGC012345
```

Use `--json` when you need structured output.

`sources list` and `sources show` include registry-only sources. `sync` and `verify` only run for sources with implemented adapters. URL sync requires `--allow-network`.

## Exit Codes

- `0`: success
- `1`: general error
- `2`: invalid input
- `3`: source unavailable or network source disabled
- `4`: no matching record in the checked source
- `5`: ambiguous match
- `6`: validation failed

The CLI does not download live agency data unless `--allow-network` is passed.
