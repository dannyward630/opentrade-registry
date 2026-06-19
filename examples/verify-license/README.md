# Verify License Example

This example checks one license number against the small local Florida DBPR fixture. It does not download live agency data.

## Matched Record

Verify one license number against the local Florida DBPR fixture:

```bash
pnpm cli -- verify \
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

```bash
pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC000000
```

If no match is found, the correct interpretation is: "No matching record was found in this source as of the checked time."

The command exits with code `4` for this case so scripts can distinguish no-match from general errors.
