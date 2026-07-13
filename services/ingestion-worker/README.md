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

Before enqueue, the operator command requires a fresh storage-health observation, verifies that the local staging file is a regular file below `OPENTRADE_SNAPSHOT_ROOT`, is within `OPENTRADE_MAX_SNAPSHOT_BYTES`, and has been stored in the private snapshot bucket with matching byte length, source identity, SHA-256 metadata, and server checksum. The handler checks storage admission again before parsing and immediately before promotion. It also verifies the read-only staging copy and immutable archive before parsing and promotion.

The private `storage-monitor` process measures the filesystem that owns the MinIO snapshot volume and publishes an atomic status file. Missing, malformed, future-dated, threshold-mismatched, or stale status fails closed. The default policy records a warning below 15% free space and rejects enqueue or promotion below 10%. Warning and promotion observations are included in structured command/job results.

## Development

```bash
corepack pnpm --filter @opentrade-registry/ingestion-worker typecheck
corepack pnpm --filter @opentrade-registry/ingestion-worker build
corepack pnpm exec vitest run tests/ingestion-worker.test.ts
```

The package is private and is not included in the public npm release set.

## Compose

The worker is an opt-in Compose profile. Configure `WORKER_DATABASE_URL` with a dedicated login role that is a member of `opentrade_worker`. Configure a separate `MINIO_WORKER_USER` and `MINIO_WORKER_PASSWORD`; `minio-init` grants that identity read/write access to the private versioned snapshot bucket without object deletion or administrative permissions. Then start the worker explicitly:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker up -d storage-monitor ingestion-worker
```

Configure adapters with package/export pairs before starting the profile. For example:

```dotenv
OPENTRADE_WORKER_ADAPTERS=@opentrade-registry/adapter-fl-dbpr:floridaDbprConstructionAdapter
```

Multiple adapters are comma-separated. The worker image contains the current working adapter packages, but an empty value leaves `snapshot_import` unregistered. Do not reuse the database-owner credential. The default Compose start does not launch this service.

`storage-monitor` has no network, database credential, or object-storage credential. It mounts the snapshot volume read-only and writes only `/var/run/opentrade/storage-health.json`; the worker receives that state volume read-only. The monitor runs with a read-only container filesystem, all Linux capabilities dropped, and `no-new-privileges`. `OPENTRADE_STORAGE_STATUS_MAX_AGE_MS` should remain greater than the monitor interval while still detecting a stopped monitor promptly.

## Enqueue A Local Snapshot

Place the reviewed source file under `SNAPSHOT_STAGING_PATH` and prepare a request JSON as described in [the ingestion contract](../../docs/ingestion.md). Then run the one-shot operator command in the worker image:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker run --rm \
  ingestion-worker node dist/enqueue-main.js \
  --request /var/lib/opentrade/staging/import-request.json
```

The command checks storage admission before reading the request, creating an archive client, or opening Postgres. It then loads the source host, adapter package, adapter version, and redistribution status from trusted registry/package metadata; those authority fields cannot be self-asserted by request JSON. It validates the object key, inspects the local file, and conditionally writes the immutable object to MinIO. Existing keys are never overwritten. A successful archive `HEAD` must return the same byte length, source metadata, metadata SHA-256, and server SHA-256 before the command calls the idempotent Postgres enqueue function. Archive evidence is added to snapshot metadata by the trusted command and overrides any request-supplied `archive` field. Repeating the same reviewed request verifies and reuses the existing snapshot and job. The long-running handler repeats storage admission and archive verification before promotion; pressure, loss, or mutation prevents publication.
