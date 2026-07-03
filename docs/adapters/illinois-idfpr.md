# Illinois Source And Adapter Notes

Source ID: `us.il.idfpr.roofing_contractors`

Historical package: `@opentrade-registry/adapter-il-idfpr` (private, not published)

Current maturity: `blocked`

Quality level: 0

## Current Scope

The repository retains parser research shaped around Illinois Department of Financial and Professional Regulation roofing-contractor lookup concepts. Its tiny hand-authored fixture does not establish compatibility with an official file or lookup response.

No stable public downloadable file shape was validated during the v1 review. The CLI does not register this parser and the package is not published.

The statewide board ledger also tracks these Illinois source entries as blocked metadata/manual-handoff paths:

- `us.il.idph.plumbing` for IDPH plumbing and irrigation credential paths;
- `us.il.idph.asbestos_contractors` for the IDPH asbestos licensed-contractor open-data path;
- `us.il.icc.distributed_generation_installers` for ICC distributed generation installer certification;
- `us.il.sfm.fire_sprinkler_contractors` for OSFM fire sprinkler contractor and inspector licensing.

Those entries support board coverage decisions, but none expose a supported OpenTrade adapter yet. Future work must review field shape, terms, technical controls, privacy handling, fixtures, and neutral verification semantics before any sync or verify command is enabled.

## Fixture Behavior

The fixture covers:

- active roofing contractor records;
- duplicate normalized license numbers for ambiguous verification;
- expired roofing contractor rows;
- suspended roofing contractor rows;
- a non-roofing IDFPR profession row;
- a pending/unknown roofing-shaped row with a missing expiration date.

The adapter preserves raw rows, fingerprints, fetched time, source URL, warnings, and caveats.

## Verification Caveats

No-match wording must remain neutral:

> No matching record was found in this source as of the checked time.

Do not imply that a missing Illinois IDFPR fixture match proves no state license, local authorization, business registration, or other credential exists.

## Reconsideration Criteria

- Verify whether IDFPR exposes a roofing-specific export shape that can be used lawfully.
- Review whether the IDPH asbestos open-data path can support a privacy-reviewed Socrata adapter.
- Review whether OSFM's fire sprinkler PDF report can be parsed safely without over-publishing personal data.
- Review whether IDPH plumbing and ICC distributed generation installer paths expose stable public interfaces.
- Keep live lookup and bulk lookup automation out of default tests and require explicit network opt-in if it is ever implemented.
