# Maintainer Responsibilities

## Source Maintainers

- review evidence before `nextReviewAt`;
- keep coverage, caveats, terms posture, and blocker evidence accurate;
- preserve neutral verification semantics;
- respond to agency field/status changes with fixtures and tests.

## Release Maintainers

- enforce semantic versioning and compatibility policy;
- verify all local, package, security, and GitHub gates;
- create signed tags and provenance-backed packages;
- publish changelog and checksums;
- confirm optional hosted metadata parity.

## Security Maintainers

- triage private reports and automated alerts;
- protect sensitive report data;
- coordinate patch/advisory/release timing;
- review shared parser, network, storage, and release surfaces after a finding.

Repository ownership is recorded in `.github/CODEOWNERS`. Ownership is review responsibility, not permission to weaken source evidence or data-use safeguards.
