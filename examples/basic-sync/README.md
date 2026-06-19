# Basic Sync Example

This example syncs the tiny Florida DBPR fixture included in this repository. It does not download live agency data.

## Prerequisites

Run from the repository root after installing dependencies:

```bash
corepack pnpm install
```

## JSONL Export

Run a local fixture sync and write canonical JSONL:

```bash
pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.jsonl
```

Each line in the output is one canonical license record with source metadata, caveats, raw record data, and fingerprint.

Expected summary:

```text
Wrote 5 JSONL canonical records to ./out.jsonl
```

## CSV Export

Write a safe canonical CSV view:

```bash
pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.csv \
  --format csv
```

The CSV export intentionally includes a narrow set of canonical fields and does not include full raw source JSON.

Remove generated outputs after experimenting:

```bash
rm -f ./out.jsonl ./out.csv
```
