# @opentrade/cli

Command-line interface for OpenTrade Registry.

## Commands

```bash
opentrade sources list
opentrade sources show us.fl.dbpr.construction
opentrade sources validate
opentrade sync us.fl.dbpr.construction --file ./fixture.csv --out ./records.jsonl
opentrade sync us.fl.dbpr.construction --file ./fixture.csv --out ./records.csv --format csv
opentrade verify --source us.fl.dbpr.construction --file ./fixture.csv --license CGC012345
```

Use `--json` for structured command output where supported.

## Exit Codes

- `0`: success
- `1`: general error
- `2`: invalid input
- `3`: source unavailable or network source disabled
- `4`: no matching record in the checked source
- `5`: ambiguous match
- `6`: validation failed

No command performs live source downloads in v0.1.

