# Security Policy

If you find a security issue, use a private security advisory once advisories are enabled. If that is not available, open a minimal issue asking maintainers to enable private disclosure. Do not post sensitive details in a public issue.

Do not include sensitive personal data in a report unless it is necessary to explain the issue.

OpenTrade Registry should not bypass CAPTCHAs, login walls, paywalls, or technical access controls.

## Supported Versions

OpenTrade Registry is pre-1.0. Security fixes target the latest `main` branch until versioned releases begin.

## Security-Sensitive Areas

- Source fetching and future network sync.
- CLI file path handling.
- Raw public-record preservation.
- Generated exports.
- Package publishing and release provenance.
