# Minnesota DLI Adapter Notes

Source ID: `us.mn.dli.licenses_registrations`

Current maturity: `local_file_adapter`

The Minnesota Department of Labor and Industry publishes a nightly ZIP archive containing CSV data for licenses, bonds, certifications, and registrations issued by the Construction Codes and Licensing Division. The official CSV header and representative row shape were reviewed on June 28, 2026. The adapter accepts extracted local CSV and XLSX snapshots; tests use tiny hand-authored fixtures.

## Current Local-File Support

The adapter can parse and normalize:

- license number;
- license type;
- business/name fields;
- DBA;
- public-record address fields;
- phone;
- status;
- issue and expiration dates;
- discipline indicator;
- raw record and fingerprint.

The fixture includes active, expired, suspended, missing-expiration, quoted-name, and duplicate-license-number cases.

## Status Mapping

- `Issued` and `Active` map to `active` unless an expiration date is already in the past.
- `Expired` maps to `expired`.
- `Suspended` maps to `suspended`.
- `Revoked` maps to `revoked`.
- `Pending` maps to `pending`.
- Unknown labels map to `unknown`.

## Category Mapping

The adapter maps obvious labels only:

- Residential Building Contractor: `residential_contracting`
- Residential Remodeler: `home_improvement`
- Plumbing Contractor: `plumbing`
- Electrical Contractor: `electrical`
- Contractor Registration: `other`

Unknown or broad source labels stay `unknown` rather than overclaiming coverage.

## Caveats

The DLI source can include many license, bond, certification, and registration types beyond contractor licenses. Users should not treat every row as a contractor license without source-specific type filtering.

No-match wording remains:

> No matching record was found in this source as of the checked time.

## Operational Limits

- Download and ZIP extraction remain caller-operated; the adapter consumes the extracted file.
- Keep any future archive download path opt-in and outside default tests.
- Revisit redistribution terms before publishing any generated datasets.
