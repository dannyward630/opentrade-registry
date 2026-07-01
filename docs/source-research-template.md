# Source Research Template

Use this checklist before adding a new source registry entry. The goal is to record official-source facts without overclaiming coverage or redistribution rights.

## Required Source Facts

- Jurisdiction:
- Agency name:
- Agency URL:
- Official source URL:
- Official lookup URL:
- Official bulk download URL or notes:
- Documentation URL:
- Data dictionary URL:
- Terms or privacy URL:
- Update frequency:
- License types included:
- Known exclusions:

## Access And Data-Use Notes

- Bulk download available: `true`, `false`, or `unknown`
- Live lookup available: `true`, `false`, or `unknown`
- JavaScript required: `true`, `false`, or `unknown`
- CAPTCHA present: `true`, `false`, or `unknown`
- Account required: `true`, `false`, or `unknown`
- Rate-limit or operational notes:
- Redistribution status: `allowed`, `restricted`, or `unknown`
- Public-record caveats:
- Privacy concerns, including individual home-address exposure:

## Review Evidence

- Research reviewed at:
- Next review at:
- Official evidence URLs and what each proves:
- Missing terms/lookup review notes, if applicable:

## Adapter Readiness

- Terminal source outcome: `production_ready`, `network_opt_in`, `local_file_adapter`, `blocked`, or `deprecated`
- Adapter maturity:
- Coverage scope:
- Candidate package name:
- Fixture plan:
- Fields likely needed for canonical mapping:
- Verification wording caveats:
- Blocker code, summary, and evidence URLs when blocked:

## Board Trade Coverage

For each applicable required trade domain, record one decision in `registry/board-coverage.json`:

- `covered_by_board`: list every registered board ID that provides statewide coverage;
- `not_state_regulated`: cite official evidence that no statewide license applies;
- `local_only`: cite official evidence that regulation is municipal, county, or otherwise below statewide scope;
- `needs_research`: temporary only and prohibited when the inventory becomes `board_complete`.

Do not infer a terminal decision from an agency name, a broad professional lookup, or the absence of search results. Evidence must describe the regulatory scope, not merely prove that a website exists.

## Acceptance Checklist

- The URL is from an official agency or official open-data portal.
- No generated public dataset is committed.
- No network test is added to default CI.
- No access controls are bypassed.
- Absence from the source is described only as no matching record in that source at the checked time.
- The source has no provisional outcome when merged for release.
