# Florida DBPR URL Sync Design

OpenTrade Registry v0.1 only reads local files. A future Florida DBPR URL sync path should remain explicit and opt-in.

Planned flags:

- `--url <source-url>`: source URL to fetch instead of a local file
- `--allow-network`: required guard before any network request is made
- `--source-last-modified <iso-date>`: optional caller-provided source freshness metadata

Future behavior:

- Refuse network sync unless `--allow-network` is present.
- Prefer official bulk file URLs over page automation.
- Fetch remote metadata with `HEAD` when available.
- Preserve `Last-Modified`, `ETag`, fetched time, source URL, caveats, raw record data, and fingerprint.
- Keep network tests out of default local and CI runs.

Operational cautions:

- Respect posted terms and robots guidance where applicable.
- Do not bypass CAPTCHAs, login walls, or technical controls.
- Do not publish generated datasets unless redistribution is clearly allowed.

