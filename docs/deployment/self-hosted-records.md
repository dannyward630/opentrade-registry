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
2. Pin reviewed image digests before production use.
3. Start the private storage services:

   ```bash
   docker compose --env-file infra/.env -f infra/compose.yaml up -d postgres minio minio-init
   ```

4. Confirm Postgres and MinIO report healthy status.
5. Verify the `opentrade-snapshots` bucket denies anonymous access.

Postgres runs the ordered SQL files under `infra/postgres/migrations` only when initializing a new data volume. Existing deployments require an explicit migration runner before schema changes are deployed.

## Data Guarantees

- source snapshots are immutable and checksum-deduplicated;
- import manifests and record versions are append-only;
- current records change only through one transaction-scoped promotion function;
- additions, changes, and removals are recorded during promotion;
- workers claim jobs with `FOR UPDATE SKIP LOCKED`;
- application services inherit narrowly scoped API or worker roles;
- snapshot ingestion must stop at critical disk thresholds rather than delete history.

Backups, external replication, restore drills, and disk alerts are release blockers before production records are imported.
