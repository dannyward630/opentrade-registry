# Florida DBPR URL Sync Design

v0.1 reads local files only. A future Florida DBPR download path should stay explicit, opt-in, and easy to audit.

## Planned Flags

- `--url <source-url>`: fetch a source URL instead of reading a local file.
- `--allow-network`: required before any network request is made.
- `--source-last-modified <iso-date>`: optional caller-provided source freshness metadata.

## Intended Behavior

- Refuse network sync unless `--allow-network` is present.
- Prefer the official bulk CSV URL over page automation.
- Capture remote metadata such as `Last-Modified`, `ETag`, fetched time, source URL, caveats, raw record data, and fingerprint.
- Keep network tests out of default local and CI runs.

## Operational Notes

Use the official source responsibly. Respect posted terms and technical controls. Do not publish generated datasets unless redistribution is clearly allowed.
