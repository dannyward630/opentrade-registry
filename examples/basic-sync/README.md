# Basic Sync Example

Run a local fixture sync and write canonical JSONL:

```bash
pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.jsonl
```

Each line in the output is one canonical license record with source metadata, caveats, raw record data, and fingerprint.

