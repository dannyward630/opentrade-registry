# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| `1.x` | Yes |
| `<1.0` | No |

## Reporting

Use a private GitHub security advisory. Do not disclose exploit details, credentials, private source snapshots, or personal data in a public issue. If private advisories are unavailable, open a minimal issue requesting a private contact channel.

## Security Boundaries

Sensitive areas include official URL validation, redirects, CSV/XLSX parsing, formula injection, decompression limits, local file paths, raw personal data, SQLite retention/redaction, hosted error handling, dependencies, Actions, and package provenance.

OpenTrade does not bypass CAPTCHA, account, login, paywall, or technical controls. Default tests remain offline.

See the [repository threat model](docs/security-threat-model.md) for assets, trust boundaries, attacker stories, existing controls, and severity calibration.

## Maintainer Response

High and critical issues block release. Maintainers reproduce with safe fixtures, patch with regression coverage, audit related shared paths, and publish advisories/patch releases when users need action. See [incident response](docs/incident-response.md).

Run:

```bash
corepack pnpm security:audit
corepack pnpm audit --prod
corepack pnpm verify
```

Dependabot, CodeQL, dependency review, and secret scanning are monitored. Alerts are fixed at the cause or documented as verified false positives; they are not dismissed for convenience.
