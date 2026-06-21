# California CSLB Adapter Plan

California CSLB is currently registry metadata only. Do not add live network behavior or generated datasets while planning the adapter.

## Official Sources

- Data portal: `https://www.cslb.ca.gov/onlineservices/dataportal/`
- Master list page: `https://www.cslb.ca.gov/OnlineServices/DataPortal/__FriendlyUrls_SwitchView?ReturnUrl=%2Fonlineservices%2Fdataportal%2FContractorList`
- Instant license check: `https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx`

CSLB describes a master list of licensed contractors and companion files for workers' compensation and personnel data. The adapter should start with the license master file only.

## No-Network Implementation Path

1. Research the current downloadable file formats and column names.
2. Hand-author a tiny fixture that mirrors the documented column shape without copying bulk public rows.
3. Create `packages/adapter-ca-cslb` with parser, mapper, normalizer, fixture, and tests.
4. Map license number, business identity, classifications, status, expiration dates, source URL, fetched time, raw record, and fingerprint.
5. Keep companion files out of scope until the license master path is stable.
6. Keep network download disabled unless a later `--allow-network` path is designed and tested separately.

## Caveats

- The most current status may require official live lookup.
- Redistribution is not assumed to be allowed.
- The source may expose public-record contact fields that need careful downstream handling.
- A missing match must not be described as proof that no license exists.
