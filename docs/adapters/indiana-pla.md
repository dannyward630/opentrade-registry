# Indiana Source Research

Indiana has three terminal blocked source entries. OpenTrade does not expose an automated Indiana adapter because PLA bulk files require acceptance of user conditions and payment, the MyLicense response contract has not been reviewed for automation, and IDEM has no confirmed stable public asbestos roster.

## Source

- Broad source ID: `us.in.pla.professional_licenses`
- Plumbing source ID: `us.in.pla.plumbing`
- Asbestos source ID: `us.in.idem.asbestos_licensing`
- Historical package: `@opentrade-registry/adapter-in-pla` (private, not published)
- Current maturity: `blocked`
- Current quality level: Level 0
- Fixture: `packages/adapter-in-pla/fixtures/professional-licenses-sample.csv`

The broad registry entry is scoped to Indiana Professional Licensing Agency MyLicense verification and license-download-shaped records that may include construction-relevant credentials. The Plumbing Commission entry documents apprentice, journeyman, plumbing contractor, and temporary plumbing contractor credentials. The IDEM entry documents asbestos contractor licensing and an evidence-backed no-stable-source blocker.

Indiana's official business guide states that plumbers are the only construction contractors licensed by the state and directs other construction users to local building officials. The board ledger therefore records plumbing and asbestos as covered by distinct statewide programs and the remaining tracked construction domains as local-only. Local registrations, permits, public-works rules, and trade-specific requirements can still apply.

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
- IDEM program documentation does not provide a supported searchable roster, API, or bulk file.
- No matching record means no match in the checked source at the checked time, not proof that a state license, local registration, or authorization does not exist elsewhere.

The fixture does not establish compatibility with an official paid download. The CLI does not register this parser.

## Reconsideration Criteria

- Confirm the current official downloadable-license-file shape and whether it can be accessed and used lawfully.
- Review PLA verification API and paid-download terms before any automation.
- Revalidate construction-relevant PLA credential types against the separate plumbing source entry.
- Re-review IDEM for a stable official asbestos contractor roster or export.
- Preserve local-license exclusions in verification output.
