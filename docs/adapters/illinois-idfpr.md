# Illinois IDFPR Adapter Notes

Source ID: `us.il.idfpr.roofing_contractors`

Package: `@opentrade/adapter-il-idfpr`

Current maturity: `fixture_adapter`

Quality level: 4

## Current Scope

The Illinois adapter reads a tiny hand-authored CSV fixture shaped around Illinois Department of Financial and Professional Regulation roofing-contractor lookup concepts.

It does not access the live IDFPR license lookup or bulk lookup service. Future work must verify the current official field shape, access controls, terms, and update metadata before any local-file or opt-in-network promotion.

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

## Future Work

- Verify whether IDFPR exposes a roofing-specific export shape that can be used lawfully.
- Decide whether other Illinois trade or construction sources need separate source entries.
- Keep live lookup and bulk lookup automation out of default tests and require explicit network opt-in if it is ever implemented.
