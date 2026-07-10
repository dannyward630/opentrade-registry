# Ingestion Worker

`@opentrade-registry/ingestion-worker` is the private v2 job-lifecycle service. It owns the database boundary around queued work and leaves source-specific parsing and promotion handlers injectable.

## Current Capability

- claims one queued job with `FOR UPDATE SKIP LOCKED` through the Postgres function contract;
- dispatches jobs by `kind` to an explicitly supplied handler;
- sends heartbeats and observes cancellation requests;
- records completion or structured failure through stored procedures;
- leaves retry and dead-letter transitions to the database lifecycle functions;
- does not write `current_records` directly.

The container entrypoint registers source-specific handlers only when `OPENTRADE_WORKER_ADAPTERS` is explicitly configured. Unsupported jobs are failed with a structured error. This is deliberate: a worker must not publish records until an adapter handler has passed source-specific privacy, schema-drift, and promotion checks.

Before parsing, the handler verifies that the local staging file is a regular file below `OPENTRADE_SNAPSHOT_ROOT`, is within `OPENTRADE_MAX_SNAPSHOT_BYTES`, and matches the registered SHA-256. It verifies the digest again before promotion. The staging mount is read-only in Compose.

## Development

```bash
corepack pnpm --filter @opentrade-registry/ingestion-worker typecheck
corepack pnpm --filter @opentrade-registry/ingestion-worker build
corepack pnpm exec vitest run tests/ingestion-worker.test.ts
```

The package is private and is not included in the public npm release set.

## Compose

The worker is an opt-in Compose profile. Configure `WORKER_DATABASE_URL` with a dedicated login role that is a member of `opentrade_worker`, then start it explicitly:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker up -d ingestion-worker
```

Configure adapters with package/export pairs before starting the profile. For example:

```dotenv
OPENTRADE_WORKER_ADAPTERS=@opentrade-registry/adapter-fl-dbpr:floridaDbprConstructionAdapter
```

Multiple adapters are comma-separated. The worker image contains the current working adapter packages, but an empty value leaves `snapshot_import` unregistered. Do not reuse the database-owner credential. The default Compose start does not launch this service.

## Enqueue A Local Snapshot

Archive the immutable snapshot privately first, place the adapter-readable copy under `SNAPSHOT_STAGING_PATH`, and prepare a reviewed request JSON as described in [the ingestion contract](../../docs/ingestion.md). Then run the one-shot operator command in the worker image:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker run --rm \
  ingestion-worker node dist/enqueue-main.js \
  --request /var/lib/opentrade/staging/import-request.json
```

The command validates the source host and object key, inspects the local file, and calls one idempotent Postgres function that registers the snapshot and queues the import. Repeating the same reviewed request returns the existing snapshot and job. It does not upload to MinIO or verify that the object exists there; that archive check remains an explicit operator prerequisite until the archival service is connected.
