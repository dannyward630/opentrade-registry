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

1. Create `infra/.env` from `infra/.env.example` and replace every placeholder with unique secrets.
   Set both `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to enable developer key management, or leave both empty for public read-only operation. Never put a Supabase service-role key in this service.
2. Pin reviewed image digests before production use.
3. Start the private storage services:

   ```bash
   docker compose --env-file infra/.env -f infra/compose.yaml up -d postgres minio minio-init
   ```

4. Confirm Postgres and MinIO report healthy status.
5. Verify the `opentrade-snapshots` bucket denies anonymous access.
6. Start `record-api`, verify `/health`, then test anonymous search limits and the authenticated create/list/revoke key lifecycle before exposing ingress.

The ingestion worker is a separate opt-in profile and requires a dedicated login role with membership in `opentrade_worker`:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker up -d ingestion-worker
```

The current worker entrypoint provides job claiming, heartbeats, cancellation observation, and failure/dead-letter lifecycle calls. Queued jobs without an explicitly wired handler are failed safely. Do not treat the profile as production ingestion until a handler has its adapter conformance tests and a successful local promotion drill.

Set `OPENTRADE_WORKER_ADAPTERS` in `infra/.env` to explicitly enable packaged adapter exports. The value is a comma-separated list such as `@opentrade-registry/adapter-fl-dbpr:floridaDbprConstructionAdapter`. An empty value keeps snapshot imports disabled.

Set `SNAPSHOT_STAGING_PATH` to a host directory containing operator-reviewed snapshot files and request JSON. Compose mounts it read-only at `/var/lib/opentrade/staging`. `OPENTRADE_MAX_SNAPSHOT_BYTES` is a hard per-file ceiling; lower it to the largest reviewed source shape when practical. Create the host directory before starting or running the worker.

After uploading and checksum-verifying a snapshot in the private MinIO bucket, enqueue it with the one-shot command documented in [Ingestion And Promotion Contract](../ingestion.md). Enqueueing is idempotent but currently does not perform the MinIO upload or object `HEAD` verification. Do not queue an object key that has not been archived successfully.

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
- snapshot ingestion must stop at critical disk thresholds rather than delete history.

Backups, external replication, restore drills, and disk alerts are release blockers before production records are imported. A container runtime has not been installed or started on the current Mac, so these operational checks remain pending.
