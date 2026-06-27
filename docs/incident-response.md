# Security Incident Handling

Report vulnerabilities privately using the process in [SECURITY.md](../SECURITY.md). Do not open a public issue containing exploit details, credentials, personal data, or an unpublished vulnerable source snapshot.

## Maintainer Procedure

1. Acknowledge and restrict sensitive details.
2. Reproduce with the smallest safe fixture.
3. Assess affected versions, packages, data, and hosted metadata.
4. Revoke exposed credentials and pause affected network paths when necessary.
5. Patch with regression tests and run security, package, and full verification gates.
6. Publish a GitHub security advisory and patched release when users need action.
7. Document whether cached or exported personal data needs deletion or redaction.
8. Review similar adapters and shared parser/network code.

High and critical findings block release. Dependency, CodeQL, and secret-scanning alerts should be resolved at the cause or explicitly documented as verified false positives.
