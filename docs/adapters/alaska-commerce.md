# Alaska CBPL Adapter Notes

Source ID: `us.ak.commerce.construction_contractors`

Package: `@opentrade/adapter-ak-commerce`

Current maturity: `fixture_adapter`

Quality level: 4

## Current Scope

The Alaska adapter reads a tiny hand-authored CSV fixture shaped around Alaska Division of Corporations, Business and Professional Licensing professional-license concepts for construction-contractor records.

It does not download the live Alaska search or database-download pages. Command-line access to the apparent download path was observed to be protected by DataDome, so OpenTrade does not attempt to bypass that control.

## Fixture Behavior

The fixture covers:

- active construction contractor records;
- duplicate normalized license numbers for ambiguous verification;
- expired residential contractor endorsement rows;
- suspended specialty contractor rows;
- a non-trade professional-license row;
- an unknown status/classification row.

The adapter preserves raw rows, fingerprints, fetched time, source URL, warnings, and caveats.

## Verification Caveats

No-match wording must remain neutral:

> No matching record was found in this source as of the checked time.

Do not imply that a missing Alaska CBPL fixture match proves no state license, endorsement, business license, local registration, or other authorization exists.

## Future Work

- Manually verify the current official download field layout before considering local-file promotion.
- Keep CBPL professional licensing separate from Alaska business-license and corporation records.
- Do not add live automation unless access terms and technical controls clearly allow it.
