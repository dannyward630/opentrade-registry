# Alaska CBPL Adapter Notes

Source ID: `us.ak.commerce.construction_contractors`

Historical package: `@opentrade-registry/adapter-ak-commerce` (private, not published)

Current maturity: `blocked`

Quality level: 0

## Current Scope

The repository retains parser research shaped around Alaska Division of Corporations, Business and Professional Licensing concepts. Its tiny hand-authored fixture does not establish compatibility with an official export.

Command-line access to the apparent download path was observed to be protected by DataDome. OpenTrade does not bypass that control, register this parser in the CLI, or publish the package.

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

## Reconsideration Criteria

- Confirm a lawful stable official file shape without bypassing technical controls.
- Keep CBPL professional licensing separate from Alaska business-license and corporation records.
- Do not add live automation unless access terms and technical controls clearly allow it.
