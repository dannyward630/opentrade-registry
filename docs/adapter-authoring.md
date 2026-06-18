# Adapter Authoring

An adapter implements the `TradeLicenseSourceAdapter` interface from `@opentrade/core`.

Required capabilities:

- return source metadata
- check local or remote availability
- stream raw source records
- normalize each raw record into a canonical record

Optional capabilities:

- fetch remote snapshot metadata
- look up a single license if the source supports live lookup

Adapter tests should use small fixtures and must not require network calls by default. Store raw records, fingerprints, source URL, fetched time, caveats, and source freshness when available.

Do not bypass CAPTCHAs, login walls, or technical access controls.

