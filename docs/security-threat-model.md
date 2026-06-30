# Security Threat Model

## Overview

OpenTrade Registry discovers, imports, normalizes, verifies, and exports official contractor and skilled-trade license records. Its local-first packages and CLI can operate without hosted infrastructure. The optional hosted platform adds publication-reviewed record search, verification jobs, developer credentials, Postgres record history, and private snapshot storage.

The security objective is to preserve source provenance and neutral verification semantics while preventing untrusted sources, public clients, or compromised dependencies from crossing into operator systems, private data, credentials, or published records. Availability is important, but integrity, privacy, and truthful source attribution take priority over completing an import.

Primary runtime surfaces are local tabular/JSON ingestion and export, opt-in official-host downloads, the v2 public API, private Postgres and MinIO services, future ingestion/browser workers, the metadata-only Vercel/Supabase surface, and CI/npm release automation.

## Threat Model, Trust Boundaries, and Assumptions

### Assets and Actors

Protected assets include canonical-record integrity; raw provenance, fingerprints, snapshot checksums, and observation times; publication and sensitivity decisions; immutable history; Supabase tokens and OpenTrade API-key hashes; database, storage, npm, signing, and infrastructure credentials; private snapshots and backups; registry evidence; and service availability.

Public users control search, verification, headers, and request volume. Developers authenticate through Supabase and create OpenTrade keys. Source publishers control files, APIs, portal HTML, redirects, headers, and record contents. Operators control allowlists, publication assessments, secrets, migrations, and releases. Contributors and dependencies influence source, workflows, lockfiles, and artifacts.

### Trust Boundaries

1. **Official source boundary.** Remote URLs, redirects, metadata, archives, spreadsheets, CSV cells, JSON, and portal output remain attacker-controlled even on an allowlisted government host.
2. **Local filesystem boundary.** User-selected inputs and output paths must not permit archive traversal, unrelated-file overwrite, formula execution, or failed-import residue.
3. **Canonicalization boundary.** Adapter output becomes trusted only after schema validation. Unknown mappings remain explicit and cannot silently become favorable licensing claims.
4. **Publication boundary.** Public APIs expose only records approved for publication. Raw data, home addresses, contact details, history, and caches remain private until source-specific terms and privacy review permit disclosure.
5. **Identity and API-key boundary.** Supabase verifies identity; OpenTrade issues separate one-time-disclosed, hashed, revocable keys. Client-supplied identities are never trusted without verified claims. A Supabase service-role credential must not be present in the record API.
6. **Public API boundary.** Internet clients reach only HTTP APIs. Postgres, MinIO, workers, and maintenance ports remain private. Cloudflare Tunnel may eventually route the API and no other service.
7. **Private infrastructure boundary.** API, workers, databases, object storage, backups, and operator hosts have distinct privileges. Public API compromise must not grant database-owner, snapshot-administrator, worker, or host access.
8. **Browser-worker boundary.** Future browser automation processes hostile HTML in an isolated optional worker without operator sessions, broad egress, cloud metadata, or shared secrets. CAPTCHA, login, paywall, anti-bot, and technical controls are never bypassed.
9. **Supply-chain boundary.** Pull requests, Actions, dependencies, release workflows, and npm publication cross from contributor input into privileged automation.

### Invariants and Assumptions

- Network access is off by default and requires explicit operator intent.
- Production downloads use HTTPS and exact registered hosts; loopback HTTP exists only for tests.
- Redirects are revalidated; credentials, excess redirects, timeout, and oversized content fail closed.
- Archive paths, entry counts, compressed/uncompressed sizes, and decompression ratios are bounded.
- Default tests never contact agency sites, and fixtures contain no production dataset.
- Failed imports never replace valid current data; accepted history is immutable.
- A no-match result is limited to the source and checked time, never a claim that someone is unlicensed.
- Generated datasets remain unpublished unless redistribution and privacy assessments explicitly permit them.
- Municipal licensing remains excluded unless separately reviewed and registered.
- Compromise of an operator, maintainer, host OS, or provider control plane cannot be fully prevented in this repository; controls must limit blast radius and preserve recovery evidence.

## Attack Surface, Mitigations, and Attacker Stories

### Source Downloads and SSRF

An attacker may target localhost, cloud metadata, internal services, or permissive redirects. `packages/registry/src/network.ts` requires exact host allowlists, permits HTTPS plus test-only loopback HTTP, rejects URL credentials, manually follows and revalidates bounded redirects, streams under timeout/byte limits, and records SHA-256. Production configuration must reject wildcards, internal hosts, user-controlled hosts, and IP literals. Resolved-address controls remain required before hosted ingestion.

### Malicious Files and Archives

Agency files can contain malformed quoting, excessive dimensions, formula injection, oversized values, duplicate identifiers, schema drift, traversal, or decompression bombs. Parsers must bound memory and dimensions, isolate malformed rows, escape spreadsheet exports, and never execute macros, templates, links, or embedded code. `packages/registry/src/archive.ts` bounds size, entry count, path safety, and compression ratio, and accepts exactly one tabular file.

### Mapping and Verification Integrity

Incorrect statuses, duplicate normalized numbers, stale snapshots, or source drift can produce harmful claims. Adapters preserve raw records, fingerprints, warnings, caveats, and canonical validation. Production imports require manifests, duplicate/count-delta checks, schema-drift detection, and atomic promotion. Verification distinguishes indexed matches, ambiguity, staleness, manual handoff, source unavailability, and source-bounded no-match.

### Privacy and PII

Official records may expose names, contact details, discipline, or home addresses. Public availability does not automatically authorize republication. Source-specific publication, privacy, minimization, retention, and redaction decisions are required. The Postgres repository filters public reads to approved records. Restricted, withheld, and review-required records must not cross the publication boundary or appear in logs, errors, analytics, fixtures, issues, or unsecured backups.

### Public API, Authentication, and Quotas

Attackers control paths, JSON, search terms, cursors, headers, identifiers, and volume. The API uses bounded inputs, parameterized SQL, sanitized errors, explicit JSON, allowlisted CORS, `nosniff`, cache controls, body limits, anonymous limits, and API-key quotas. Publication filtering is mandatory on every record read.

Supabase tokens are verified server-side. OpenTrade keys use random secrets, lookup prefixes, SHA-256 hashes, timing-safe comparison, one-time raw disclosure, owner-scoped revocation, and atomic daily usage. Tokens and raw keys must never enter logs, URLs, telemetry, query text, or persistent browser storage. Expiry, rotation, abuse detection, and route scopes are production requirements.

### Postgres, MinIO, Jobs, and Backups

Postgres and MinIO bind to loopback and an internal Compose network and must never be public ingress targets. Application and worker roles receive narrow grants. Jobs use transactional claiming and imports promote atomically. Buckets deny anonymous access. Critical disk pressure stops ingestion rather than deleting history. Backups require encryption, independent credentials, off-host replication, monitored failures, retention policy, and restore drills.

### Browser Automation and Web XSS

Portal HTML may exploit browsers, issue cross-site requests, exfiltrate secrets, download files, or exhaust resources. Browser lookup remains optional, source-specific, and offline-fixture tested. Production workers require isolated containers or VMs, fresh contexts, navigation/download and egress allowlists, CPU/memory/time limits, no operator profile, no password manager, sanitized output, and teardown after each job. Protected sources return manual handoff.

Search fields, agency values, caveats, and raw records are untrusted text. React must retain escaping, avoid unsanitized HTML, and allowlist outbound URLs. Production requires CSP, frame restrictions, referrer policy, safe stale/manual-result states, and text-only raw-record rendering.

### CI, Dependencies, and Releases

Pull requests can modify workflows, scripts, lockfiles, generated files, and packages. Workflows use minimal permissions and immutable action SHAs. Dependency review, CodeQL, offline tests, pack checks, cleanliness checks, and provenance gates precede release. Publishing should use npm Trusted Publishing/OIDC rather than a long-lived token. Signed tags, protected environments, approval, SBOMs, checksums, and clean-install verification limit supply-chain compromise.

### Out of Scope and Limits

OpenTrade cannot prove agency data is factually correct; it preserves evidence and time. It cannot prevent an authorized operator from intentionally overriding policy, though decisions should be auditable. It does not infer municipal coverage or bypass protected portals. Application controls cannot fully prevent denial of service against a residential connection or physical Mac; private ingress, limits, monitoring, and capacity planning reduce exposure.

## Severity Calibration

### Critical

- remote code execution or host escape through a parser, archive, browser, or dependency;
- compromise of database-owner, object-storage administrator, npm publisher, signing, GitHub, or Supabase service-role credentials;
- publication bypass exposing a large restricted PII collection or private snapshot archive;
- supply-chain compromise publishing malicious packages or signed artifacts.

### High

- SSRF reaching private infrastructure or metadata;
- SQL injection, cross-user API-key control, or authentication bypass;
- failed atomicity silently replacing current data with partial or attacker-controlled records;
- stored XSS affecting developers/operators, unrestricted browser egress, or destructive unrecoverable snapshot loss.

### Medium

- formula injection, bounded PII leakage, or secrets in logs;
- quota bypass or contained resource exhaustion;
- materially wrong status mapping that retains provenance and can be corrected;
- overly broad CORS or caching without demonstrated credential/private-data disclosure.

### Low

- minor public metadata leakage, one-request malformed-input crashes, or low-volume enumeration of approved public records;
- missing defense-in-depth headers without an exploitable browser path;
- documentation errors that do not alter records, publication, access, or verification semantics.

Severity decreases when exploitation requires operator-controlled input unavailable to public users and increases when a flaw crosses publication, credential, infrastructure, or release boundaries. Reports should identify the realistic actor, reachable boundary, affected asset, required configuration, and containment evidence.
