# `@opentrade-registry/cli`

The `opentrade` CLI lists source decisions, syncs implemented adapters, exports canonical records, manages local SQLite caches, and verifies one normalized license number.

```bash
opentrade sources list [--state CA] [--maturity blocked] [--research-outcome blocked]
opentrade sources show us.az.roc.contractors
opentrade sources readiness
opentrade sources coverage
opentrade sources validate

opentrade sync <sourceId> --file <path> --out <records.jsonl>
opentrade sync <sourceId> --file <path> --out <records.csv> --format csv
opentrade sync <sourceId> --file <path> --cache <cache.sqlite>
opentrade sync <sourceId> --url <official-url> --allow-network --out <records.jsonl>

opentrade verify --source <sourceId> --file <path> --license <number>
opentrade verify --source <sourceId> --cache <cache.sqlite> --license <number>
opentrade verify --source <sourceId> --url <official-url> --allow-network --license <number>
```

Use `--json` for machine-readable output and `--strict` to stop sync at the first normalization failure. Network operations require explicit consent and an implemented adapter. Blocked or unsupported source operations return structured neutral errors.

Exit codes are `0` success, `1` general error, `2` invalid/unsupported input, `3` unavailable/network disabled, `4` no match, `5` ambiguous, and `6` validation failure.

A no-match result means no matching record appeared in the checked source or cache at the checked time. It is not a licensing determination.
