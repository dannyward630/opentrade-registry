# Verify License Example

Verify one license number against the local Florida DBPR fixture:

```bash
pnpm cli -- verify \
  --source us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --license CGC012345
```

If no match is found, the correct interpretation is: "No matching record was found in this source as of the checked time."

