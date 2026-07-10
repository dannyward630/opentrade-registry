# Ingestion Worker

`@opentrade-registry/ingestion-worker` is the private v2 job-lifecycle service. It owns the database boundary around queued work and leaves source-specific parsing and promotion handlers injectable.

## Current Capability

- claims one queued job with `FOR UPDATE SKIP LOCKED` through the Postgres function contract;
- dispatches jobs by `kind` to an explicitly supplied handler;
- sends heartbeats and observes cancellation requests;
- records completion or structured failure through stored procedures;
- leaves retry and dead-letter transitions to the database lifecycle functions;
- does not write `current_records` directly.

The container entrypoint currently registers no source-specific handlers. Unsupported jobs are failed with a structured error. This is deliberate: a worker must not publish records until an adapter handler has passed source-specific privacy, schema-drift, and promotion checks.

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

Do not reuse the database-owner credential. The default Compose start does not launch this service.
