# California CSLB Adapter

California CSLB is currently fixture-supported. Do not add live network behavior or generated datasets without a separate opt-in design and source-specific review.

## Official Sources

- Data portal: `https://www.cslb.ca.gov/onlineservices/dataportal/`
- Master list page: `https://www.cslb.ca.gov/OnlineServices/DataPortal/__FriendlyUrls_SwitchView?ReturnUrl=%2Fonlineservices%2Fdataportal%2FContractorList`
- Instant license check: `https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx`

CSLB describes a master list of licensed contractors and companion files for workers' compensation and personnel data. The current adapter starts with a tiny hand-authored license-master-like fixture only.

## Current Fixture Support

- Package: `@opentrade/adapter-ca-cslb`
- Source ID: `us.ca.cslb.contractors`
- Fixture: `packages/adapter-ca-cslb/fixtures/contractors-master-sample.csv`
- Maturity: `fixture_adapter`
- Quality: Level 4 verification semantics

The fixture maps license number, business identity, DBA, classifications, status, dates, contact fields, personnel name/title, source URL, fetched time, raw record, caveats, and fingerprint. It intentionally does not parse live CSLB XLSX/CSV files or companion files.

## No-Network Next Steps

1. Research the current downloadable file formats and column names.
2. Compare the fixture shape against the live license master export without committing public bulk rows.
3. Decide whether local-file support should accept CSV only, XLSX only, or both.
4. Keep companion files out of scope until the license master path is stable.
5. Keep network download disabled unless a later `--allow-network` path is designed and tested separately.

## Caveats

- The most current status may require official live lookup.
- Redistribution is not assumed to be allowed.
- The source may expose public-record contact fields that need careful downstream handling.
- A missing match must not be described as proof that no license exists.
