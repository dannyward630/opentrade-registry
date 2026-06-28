# California CSLB Adapter

California CSLB supports local CSV and XLSX license-master snapshots. Do not add live network behavior or generated datasets without a separate opt-in design and source-specific review.

## Official Sources

- Data portal: `https://www.cslb.ca.gov/onlineservices/dataportal/`
- Master list page: `https://www.cslb.ca.gov/OnlineServices/DataPortal/__FriendlyUrls_SwitchView?ReturnUrl=%2Fonlineservices%2Fdataportal%2FContractorList`
- Instant license check: `https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx`

CSLB describes a master list of licensed contractors and companion files for workers' compensation and personnel data. The master CSV header and representative row shape were reviewed against the official download on June 28, 2026; committed fixtures remain hand-authored.

## Current Local-File Support

- Package: `@opentrade-registry/adapter-ca-cslb`
- Source ID: `us.ca.cslb.contractors`
- Fixtures: `packages/adapter-ca-cslb/fixtures/contractors-master-sample.csv` and `.xlsx`
- Maturity: `local_file_adapter`
- Quality: Level 4 verification semantics

The adapter maps license number, business identity, DBA, classifications, status, dates, contact fields, source URL, fetched time, raw record, caveats, and fingerprint. The master file does not supply the companion personnel data, and companion personnel, bond, and workers compensation files remain out of scope.

## Operational Limits

1. Obtain the official master file directly from CSLB and retain its retrieval metadata.
2. Use CSV or XLSX input locally; do not commit downloaded rows.
3. Keep companion files out of scope until separate source contracts and joins are reviewed.
4. Keep network download disabled unless a later `--allow-network` path is designed and tested separately.

## Caveats

- The most current status may require official live lookup.
- Redistribution is not assumed to be allowed.
- The source may expose public-record contact fields that need careful downstream handling.
- A missing match must not be described as proof that no license exists.
