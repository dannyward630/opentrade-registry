# Washington L&I Adapter Notes

Washington L&I support starts with a fixture adapter for the official Data.WA contractor license dataset shape.

The source is useful because it is open-data-shaped and has stable column metadata. It still needs careful handling: contractor license data does not represent every local permit, business registration, trade credential, bond, insurance, or workers compensation fact in Washington.

## Official Source

- Dataset page: `https://data.wa.gov/Labor/L-I-Contractor-License-Data-General/m8qx-ubtq`
- Column metadata: `https://data.wa.gov/api/views/m8qx-ubtq/columns.json`
- License lookup: `https://secure.lni.wa.gov/verify/`

## Current Support

- Reads a local CSV file with the official Data.WA column names.
- Includes a tiny hand-authored fixture under `packages/adapter-wa-lni/fixtures/`.
- Maps clearly understood fields: license number, business name, principal name, status, effective date, expiration date, address, phone, business type, specialties, UBI, and suspension date.
- Categorizes obvious general contractor, roofing, HVAC, electrical, and plumbing specialties.
- Preserves raw rows, source URL, fetched time, caveats, and fingerprint.

## Caveats

- The fixture is not copied from the public bulk dataset.
- Specialty/category mapping is intentionally conservative.
- Bond, insurance, workers compensation, infraction, and lawsuit fields are not normalized yet.
- Live Data.WA download is available only through explicit CLI network opt-in, not default tests.

## Future Work

- Review the full official column set and add local-file support for downloaded Data.WA CSV exports.
- Add more representative hand-authored fixture cases.
- Decide whether Washington should be promoted from `fixture_adapter` to `local_file_adapter`.
- Review verification language against official L&I lookup behavior.
