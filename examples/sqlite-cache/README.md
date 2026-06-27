# SQLite Cache Example

OpenTrade includes a working versioned SQLite cache. No external database service or native compilation is required.

From the repository root:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --cache ./opentrade.sqlite

corepack pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --cache ./opentrade.sqlite \
  --license CGC012345
```

The programmatic example in `example.ts` demonstrates the low-level schema/row helpers retained for custom drivers. For the managed runtime, use `OpenTradeSqliteCache` as documented in [Local SQLite Storage](../../docs/storage.md).

The cache is derived local data. Keep it out of git, apply source-specific retention/redaction decisions, and do not publish it unless redistribution is clearly allowed.
