# Self-Hosted Record Infrastructure

The v2 record platform is optional. Local packages and the CLI do not require it.

`infra/compose.yaml` defines private Postgres and MinIO services. Maintenance ports bind only to `127.0.0.1`; neither service may be routed through Cloudflare Tunnel or another public ingress. The `records` network is internal, the snapshot bucket is private, and containers restart unless stopped.

## Prerequisites

- a supported container runtime with Docker Compose compatibility;
- FileVault or equivalent full-disk encryption;
- sufficient local and replicated encrypted storage for indefinite snapshots;
- a Mac configured to remain awake and restart the container runtime after reboot.

This checkout has not yet run the Compose stack because no compatible container runtime is installed on the current Mac.

## First Start

1. Create `infra/.env` from `infra/.env.example` and replace every placeholder with unique secrets. Use different credentials for the MinIO administrator and snapshot-writer identity.
   Set both `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to enable developer key management, or leave both empty for public read-only operation. Never put a Supabase service-role key in this service.
2. Pin reviewed image digests before production use.
3. Start the private storage services:

   ```bash
   docker compose --env-file infra/.env -f infra/compose.yaml up -d postgres minio minio-init
   ```

4. Confirm Postgres and MinIO report healthy status.
5. Verify the `opentrade-snapshots` bucket denies anonymous access, has versioning enabled, and the worker identity cannot delete objects or administer MinIO.
6. Start `record-api`, verify `/health`, then test anonymous search limits and the authenticated create/list/revoke key lifecycle before exposing ingress.

The ingestion worker is a separate opt-in profile and requires a dedicated login role with membership in `opentrade_worker`:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker up -d ingestion-worker
```

The current worker entrypoint provides job claiming, heartbeats, cancellation observation, and failure/dead-letter lifecycle calls. Queued jobs without an explicitly wired handler are failed safely. Do not treat the profile as production ingestion until a handler has its adapter conformance tests and a successful local promotion drill.

The worker depends on the profile's `storage-monitor`, so Compose also starts it and waits for a fresh health file. Set `OPENTRADE_WORKER_ADAPTERS` in `infra/.env` to explicitly enable packaged adapter exports. The value is a comma-separated list such as `@opentrade-registry/adapter-fl-dbpr:floridaDbprConstructionAdapter`. An empty value keeps snapshot imports disabled.

Set `SNAPSHOT_STAGING_PATH` to a host directory containing operator-reviewed snapshot files and request JSON. Compose mounts it read-only at `/var/lib/opentrade/staging`. The checked-in registry is copied into the worker image at `/app/registry` and supplies trusted source-host and adapter policy to the enqueue command. `OPENTRADE_MAX_SNAPSHOT_BYTES` is a hard per-file ceiling; lower it to the largest reviewed source shape when practical. `SNAPSHOT_ARCHIVE_ENDPOINT`, `SNAPSHOT_ARCHIVE_REGION`, `SNAPSHOT_BUCKET`, and the dedicated worker credentials configure the private S3-compatible archive. Create the host staging directory before starting or running the worker.

Enqueue a reviewed staging file with the one-shot command documented in [Ingestion And Promotion Contract](../ingestion.md). The command conditionally archives it, verifies the resulting object with `HEAD`, persists archive evidence, and only then registers the snapshot and job. Existing keys are never overwritten. Enqueueing remains idempotent for identical content and adapter versions.

## Storage Pressure Admission

`storage-monitor` measures the filesystem backing the named `snapshot-data` volume every 30 seconds. It has no network and no credentials, mounts snapshots read-only, and publishes only an atomic health document to `runtime-state`. The ingestion worker mounts that state read-only.

Defaults:

- below 15% free: imports continue with a structured warning;
- below 10% free: new enqueue and final promotion fail closed;
- older than 90 seconds: status is stale and ingestion fails closed;
- missing, malformed, future-dated, or threshold-mismatched status: ingestion fails closed.

Inspect the current observation without exposing a service port:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker \
  exec storage-monitor cat /var/run/opentrade/storage-health.json
```

Before production import, perform a controlled admission drill in a disposable deployment: temporarily set `OPENTRADE_DISK_WARN_FREE_PERCENT` and `OPENTRADE_DISK_STOP_FREE_PERCENT` above the observed free percentage while preserving `stop < warning`, recreate the monitor and worker, and prove that enqueue fails before archive or database access. Restore the 15/10 defaults, recreate both services, and prove a fresh healthy observation permits the reviewed fixture import. Record timestamps, Compose configuration hash, command outputs, and the restored values in the operations log. Never fill the real disk to test this boundary.

Postgres runs the ordered SQL files under `infra/postgres/migrations` only when initializing a new data volume. Existing deployments require an explicit migration runner before schema changes are deployed.

## Data Guarantees

- source snapshots are immutable and checksum-deduplicated;
- snapshot deduplication is scoped by source ID and SHA-256;
- import jobs are idempotent for one snapshot, adapter package, and adapter version;
- import manifests and record versions are append-only;
- current records change only through one transaction-scoped promotion function;
- additions, changes, and removals are recorded during promotion;
- workers claim jobs with `FOR UPDATE SKIP LOCKED`;
- application services inherit narrowly scoped API or worker roles;
- snapshot ingestion warns below 15% free and stops enqueue/promotion below 10% free rather than deleting history;
- stale or unavailable capacity monitoring fails closed.

Backups, external replication, restore drills, alert delivery, and the controlled storage-pressure drill remain release blockers before production records are imported. A container runtime has not been installed or started on the current Mac, so the executable control is offline-tested but its host drill remains pending.
