# Hosted V2 Record API

The v2 record API is an optional self-hosted service. Local CLI and package workflows do not depend on it.

## Endpoints

- `GET /health`: private deployment health probe.
- `GET /api/v2/sources`: source metadata and board access paths.
- `GET /api/v2/licenses/search`: exact license or business-name search with state, source, status, trade, cursor, and bounded limit filters.
- `GET /api/v2/licenses/:id`: one publication-approved canonical record.
- `POST /api/v2/verifications`: indexed verification, queued permitted lookup, official manual handoff, or structured unavailable result.
- `GET /api/v2/verifications/:jobId`: asynchronous verification-job state.

Search requires a `license` or `business` value. `limit` defaults to 25 and cannot exceed 100. Postgres queries are parameterized, use keyset pagination, and return only records whose publication review disposition is `allowed`.

## Verification Semantics

- `indexed_match`: a current indexed record matched.
- `ambiguous`: more than one current indexed record matched.
- `pending`: a permitted browser lookup job was queued.
- `manual_required`: the user must complete the official lookup.
- `not_found`: no indexed match appeared in a source with indexed coverage.
- `source_unavailable`: the source is blocked or deprecated.

`not_found` never means that a person or business is unlicensed. Responses retain source URLs, observation time, source snapshot/version identifiers, caveats, and coverage context.

## Deployment Boundary

The service connects to Postgres through a bounded pool and runs on the internal Compose network. Its local port binds to `127.0.0.1`. A future Cloudflare Tunnel route may expose only this HTTP service; Postgres and MinIO must remain private.

Request bodies are capped at 64 KiB, unexpected errors are sanitized, CORS is allowlisted, and responses send `nosniff` plus explicit cache policy. Authentication, API keys, and quota endpoints are added before public deployment.
