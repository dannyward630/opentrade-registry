# Illinois IDFPR Adapter Notes

Source ID: `us.il.idfpr.roofing_contractors`

Historical package: `@opentrade/adapter-il-idfpr` (private, not published)

Current maturity: `blocked`

Quality level: 0

## Current Scope

The repository retains parser research shaped around Illinois Department of Financial and Professional Regulation roofing-contractor lookup concepts. Its tiny hand-authored fixture does not establish compatibility with an official file or lookup response.

No stable public downloadable file shape was validated during the v1 review. The CLI does not register this parser and the package is not published.

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
- Decide whether other Illinois trade or construction sources need separate source entries.
- Keep live lookup and bulk lookup automation out of default tests and require explicit network opt-in if it is ever implemented.
