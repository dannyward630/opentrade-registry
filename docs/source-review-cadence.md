# Source Review Cadence

Every source has `researchReviewedAt` and `nextReviewAt`. Review before that date, after an agency redesign, after a reported mismatch, or before promoting capability.

## Review Procedure

1. Open every official evidence URL.
2. Confirm agency ownership, source and lookup URLs, terms, access controls, and update cadence.
3. Confirm coverage boundaries and municipal exclusions.
4. Recheck redistribution posture without assuming public access grants reuse rights.
5. For adapters, compare current headers and representative status values with fixtures.
6. Re-run matched, not-found, ambiguous, malformed-row, and caveat tests.
7. Update review dates, evidence notes, and blocker details.
8. Regenerate the source matrix and Supabase seed.

An inaccessible or unstable source should move to `blocked`; it should not remain fixture-only indefinitely. Never bypass a CAPTCHA, account gate, paywall, or technical control during review.
