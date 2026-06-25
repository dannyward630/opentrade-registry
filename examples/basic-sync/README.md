# Basic Sync Example

This example turns the tiny Florida DBPR fixture in this repo into canonical records. It does not contact Florida DBPR or download live data.

The same `sync` command shape also works with the Oregon CCB, Texas TDLR, and Washington L&I fixture adapters. Florida is used here because it is the local-file adapter with the most complete sample set.

Run from the repository root after installing dependencies:

```bash
corepack pnpm install
```

## Write JSONL

This command reads the local fixture and writes one canonical record per line:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.jsonl
```

The output records include normalized license fields, source metadata, caveats, the raw record, and a fingerprint.

## Write CSV

This command writes a smaller CSV view for quick inspection:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --file packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv \
  --out ./out.csv \
  --format csv
```

The CSV intentionally omits full raw source JSON. It is a convenience export, not a complete archive.

## Expected Output Samples

`examples/basic-sync/expected/` contains one JSONL sample and one CSV sample generated from the tiny fixture. They are documentation fixtures, not public bulk data.

Remove local outputs after experimenting:

```bash
rm -f ./out.jsonl ./out.csv
```
