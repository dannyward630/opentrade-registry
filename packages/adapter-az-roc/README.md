# `@opentrade-registry/adapter-az-roc`

Parses Arizona Registrar of Contractors current-contractor posting-list CSV files into the OpenTrade canonical license schema.

The package works with local files. The CLI can download an explicitly supplied current official CSV URL only when `--allow-network` is also present. The checked-in fixture is hand-authored from official column names; it contains no copied agency records.

The posting list is dated and current-license oriented. It is not a historical register, and the agency instructs users to confirm information before taking action.
