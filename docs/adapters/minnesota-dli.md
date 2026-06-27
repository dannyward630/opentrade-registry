# Minnesota DLI Adapter Notes

Source ID: `us.mn.dli.licenses_registrations`

Current maturity: `local_file_adapter`

The Minnesota Department of Labor and Industry source describes a downloadable spreadsheet for licenses, bonds, certifications, and registrations issued by the Construction Codes and Licensing Division. The adapter accepts local CSV and XLSX snapshots; tests use tiny hand-authored fixtures and do not download the live export.

## Current Fixture Support

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

## Future Work

- Confirm the exact live XLSX file URL and workbook/column structure.
- Decide whether XLSX parsing belongs in a shared helper or a source-specific adapter.
- Keep any live download path opt-in and outside default tests.
- Revisit redistribution terms before publishing any generated datasets.
