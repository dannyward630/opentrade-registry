# Texas TDLR Adapter Notes

Texas TDLR support starts with a fixture adapter for the official TDLR All Licenses dataset shape.

The source is broad. It includes many TDLR programs, not just construction or skilled-trade licenses. The adapter should stay conservative until license-type filtering is reviewed in more detail.

## Official Source

- Dataset page: `https://data.texas.gov/dataset/TDLR-All-Licenses/7358-krk7`
- Column metadata: `https://data.texas.gov/api/views/7358-krk7/columns.json`
- License lookup: `https://www.tdlr.texas.gov/verify.htm`

## Current Support

- Reads a local CSV file with the official column names.
- Includes a tiny hand-authored fixture under `packages/adapter-tx-tdlr/fixtures/`.
- Maps clearly understood fields: license type, license number, business name, owner name, addresses, phone, expiration date, subtype, and continuing education flag.
- Categorizes obvious HVAC and electrical license types.
- Preserves raw rows, source URL, fetched time, caveats, and fingerprint.
- Carries Level 4 verification-quality metadata for local-file verification semantics.

## Caveats

- Do not treat all TDLR rows as contractor records.
- Expiration date is the only current status signal used by the fixture adapter.
- Missing or unknown license types are preserved and warned about rather than forced into a category.
- Live Texas Open Data download is not source-specific yet; use local files for normal development and tests.
- No-match verification output only means no matching record was found in the checked local source at the checked time.

## Future Work

- Research license-type filters for contractor and skilled-trade coverage.
- Add more representative hand-authored fixture cases.
- Decide whether Texas should get a source-specific opt-in URL sync path.
- Compare fixture-backed verification caveats against the official TDLR lookup before any live-source promotion.
