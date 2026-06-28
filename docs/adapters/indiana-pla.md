# Indiana PLA Adapter

Indiana PLA is a terminal blocked source for v1. Official bulk files require acceptance of user conditions and payment; OpenTrade does not expose that path as a supported adapter.

## Source

- Source ID: `us.in.pla.professional_licenses`
- Historical package: `@opentrade/adapter-in-pla` (private, not published)
- Current maturity: `blocked`
- Current quality level: Level 0
- Fixture: `packages/adapter-in-pla/fixtures/professional-licenses-sample.csv`

The registry entry is scoped to Indiana Professional Licensing Agency MyLicense verification and license-download-shaped records that may include construction-relevant credentials. It does not represent Indiana local general-contractor licensing, city/county registrations, or every construction authorization in Indiana.

## Historical Parser Research

The repository retains a fixture parser with a tiny hand-authored shape:

- license number
- license type
- license status
- business/licensee name
- DBA name
- address fields
- phone
- issue date
- expiration date
- board

The fixture includes plumbing, home-improvement, manufactured-home, electrical, duplicate-license, missing-expiration, and clearly non-trade examples. The non-trade row exists to keep filtering and warning behavior conservative.

## Verification Caveats

- Fixture support is based on a tiny hand-authored sample, not a live MyLicense export.
- The source spans many PLA professions and does not represent local general-contractor licensing.
- No matching record means no match in the checked source at the checked time, not proof that a state license, local registration, or authorization does not exist elsewhere.

The fixture does not establish compatibility with an official paid download. The CLI does not register this parser.

## Reconsideration Criteria

- Confirm the current official downloadable-license-file shape and whether it can be accessed and used lawfully.
- Review PLA verification API and paid-download terms before any automation.
- Narrow construction-relevant credential types and decide whether separate source entries are needed.
- Preserve local-license exclusions in verification output.
