# Florida DBPR URL Sync

Florida DBPR sync still works best from a local file, but the CLI now has an explicit URL path for users who want to fetch the official bulk CSV themselves.

## Required Flags

- `--url <source-url>`: fetch a source URL instead of reading a local file.
- `--allow-network`: required before any network request is made.
- `--source-last-modified <iso-date>`: optional caller-provided source freshness metadata.

## Behavior

- Refuse network sync unless `--allow-network` is present.
- Prefer the official bulk CSV URL over page automation.
- Capture remote metadata such as `Last-Modified`, `ETag`, fetched time, source URL, caveats, raw record data, and fingerprint.
- Keep network tests out of default local and CI runs.

Example:

```bash
corepack pnpm cli -- sync us.fl.dbpr.construction \
  --url https://www2.myfloridalicense.com/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv \
  --allow-network \
  --out ./florida.jsonl
```

## Operational Notes

Use the official source responsibly. Respect posted terms and technical controls. Do not publish generated datasets unless redistribution is clearly allowed.
