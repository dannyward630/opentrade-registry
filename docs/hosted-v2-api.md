# Hosted V2 Record API

The v2 record API is an optional self-hosted service. Local CLI and package workflows do not depend on it.

The generated [OpenAPI 3.1 document](openapi-v2.json) is checked for drift during `corepack pnpm verify`. Runtime Zod schemas remain the source of truth.

## Endpoints

- `GET /health`: private deployment health probe.
- `GET /api/v2/sources`: source metadata and board access paths.
- `GET /api/v2/licenses/search`: exact license or business-name search with state, source, status, trade, cursor, and bounded limit filters.
- `GET /api/v2/licenses/:id`: one publication-approved canonical record.
- `POST /api/v2/verifications`: indexed verification, queued permitted lookup, official manual handoff, or structured unavailable result.
- `GET /api/v2/verifications/:jobId`: asynchronous verification-job state.
- `GET /api/v2/developer/keys`: list API-key metadata for the authenticated developer.
- `POST /api/v2/developer/keys`: create a key and disclose its raw value once.
- `DELETE /api/v2/developer/keys/:id`: revoke a key owned by the authenticated developer.

Search requires a `license` or `business` value. `limit` defaults to 25 and cannot exceed 100. Postgres queries are parameterized, use keyset pagination, and return only records whose publication review disposition is `allowed`.

## Developer Authentication

Developer identity comes from a Supabase access token in `Authorization: Bearer <token>`. The service verifies the token claims server-side using `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; it does not accept an unverified user ID and does not require a service-role key. A client can obtain the access token through the Supabase magic-link flow.

OpenTrade developer keys are separate credentials. Only their prefix and SHA-256 hash are stored. The raw key appears only in the successful create response, can be sent in `X-API-Key` for search, and cannot be recovered later. Revocation is immediate. Daily quota consumption is atomic in Postgres; anonymous searches use a bounded in-memory fixed window. A public-only deployment may omit both Supabase variables, in which case record reads remain available and key-management routes return `401`.

Anonymous rate-limit identity comes from the Node server's accepted socket, not caller-provided forwarding headers. Any future trusted-proxy integration must overwrite, validate, and test its client-address signal at the ingress boundary before the API uses it.

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

Request bodies are capped at 64 KiB, unexpected errors are sanitized, CORS is allowlisted, and responses send `nosniff` plus explicit cache policy. API-key failures return `401`, quota and anonymous-rate failures return `429`, and raw credentials are never logged or returned by list endpoints.
