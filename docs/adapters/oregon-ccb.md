# Oregon CCB Adapter Notes

Oregon CCB support starts with a fixture adapter for the official Oregon Open Data active-license dataset shape.

The source is useful because it is open-data-shaped and exposes column metadata. It is also narrower than it may look: the source is named for active licenses, so inactive, expired, suspended, historical, local, or other agency records may be excluded.

## Official Source

- Dataset page: `https://data.oregon.gov/Business/CCB-Active-Licenses/g77e-6bhs`
- Column metadata: `https://data.oregon.gov/api/views/g77e-6bhs/columns.json`
- License lookup: `https://search.ccb.state.or.us/search/`

## Current Support

- Reads a local CSV file with the official Oregon Open Data column names.
- Includes a tiny hand-authored fixture under `packages/adapter-or-ccb/fixtures/`.
- Maps clearly understood fields: license number, license type, county, expiration date, original registration date, business name, address, phone, responsible managing individual, endorsement, bond, and insurance placeholders.
- Categorizes obvious residential, commercial, general, and home-improvement text.
- Preserves raw rows, source URL, fetched time, caveats, and fingerprint.
- Carries Level 4 verification-quality metadata for local-file verification semantics.

## Caveats

- The fixture is not copied from the public bulk dataset.
- The source appears active-license scoped; do not treat no-match results as complete absence from Oregon licensing.
- Electrical, plumbing, landscape, asbestos, and other specialized records may be regulated by separate Oregon agencies.
- Live Oregon Open Data download is available only through explicit CLI network opt-in, not default tests.
- No-match verification output only means no matching record was found in the checked local source at the checked time.

## Future Work

- Test a downloaded official CSV shape locally without committing the download.
- Add more representative hand-authored fixture cases.
- Decide whether Oregon should be promoted from `fixture_adapter` to `local_file_adapter`.
- Compare fixture-backed verification caveats against the official CCB lookup before any live-source promotion.
