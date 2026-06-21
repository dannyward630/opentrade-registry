# Verify License Example

This example checks one license number against the local Florida DBPR fixture. It only says what was found in that file.

## Matched Record

Run:

```bash
corepack pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC012345
```

Expected result:

```text
matched: One matching record was found in this source.
CGC012345 active DOE, ALEX
```

## No Match

Run:

```bash
corepack pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC000000
```

If no match is found, the careful interpretation is:

> No matching record was found in this source as of the checked time.

The command exits with code `4` so scripts can distinguish a no-match result from a general error.
