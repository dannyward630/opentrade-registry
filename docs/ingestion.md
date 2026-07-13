# Ingestion And Promotion Contract

The v2 ingestion path treats a source snapshot as immutable input and an import manifest as the boundary between parsing and publication. Local sync and future workers share the same rules.

## Lifecycle

1. Create a `pending` manifest linked to a source snapshot, adapter package, and adapter version.
2. Stream and normalize records into staging while preserving source record keys, fingerprints, warnings, and raw provenance.
3. Mark the manifest `validated` only after counts, duplicate handling, schema-drift review, canonical validation, and publication/privacy checks pass.
4. Build a deterministic promotion plan containing added, changed, removed, and unchanged records.
5. Promote the plan in one transaction scoped to the source. A failed transaction must leave the prior current dataset unchanged.
6. Mark the manifest `promoted` only after current records, record history, change records, and source health have committed together.

`packages/core/src/ingestion/manifest.ts` is the shared offline contract. `assertPromotionReady` rejects non-validated manifests, unresolved schema drift, errors, count mismatches, duplicate source keys, and cross-source records. `buildPromotionPlan` sorts changes by source record key so manifests and tests remain deterministic.

`services/ingestion-worker` is the private lifecycle service built on this contract. It claims jobs through the Postgres functions, dispatches only explicitly configured handlers, sends heartbeats, and records completion or failure without writing current records directly. It is available through the opt-in `worker` Compose profile. An empty `OPENTRADE_WORKER_ADAPTERS` value leaves source imports disabled; configuring a package/export pair enables the generic snapshot handler for that adapter, subject to the same manifest, privacy, and promotion gates.

Migration `0004_snapshot_import_enqueue.sql` adds an idempotent enqueue boundary. Snapshot deduplication is scoped to source ID plus SHA-256, and a unique job key prevents the same snapshot, adapter package, and adapter version from being queued twice. The function supplies snapshot and source identifiers in the job payload itself so caller JSON cannot replace them.

## Worker Boundary

The existing Postgres foundation in `infra/postgres/migrations/0001_v2_record_platform.sql` provides immutable snapshots, append-only record versions, current records, change history, transactional `promote_import`, and `FOR UPDATE SKIP LOCKED` job claims. Migration `0003_ingestion_worker_hardening.sql` adds heartbeats, stale-job recovery, cancellation requests, retry transitions, and dead-letter state. A worker implementation must call those contracts through the least-privilege worker role; it must not write current records outside the promotion function.

Worker retries must preserve the manifest and snapshot identifiers, heartbeat while processing, isolate malformed rows, record structured failure details, and stop retrying after the configured attempt limit. Cancellation must leave a valid prior current dataset in place. Dead-letter jobs require operator review before replay.

## Local Snapshot Enqueue

The operator command accepts a JSON file rather than a long list of security-sensitive flags. The request must be reviewed per source and stored under the read-only staging mount:

```json
{
  "sourceId": "us.fl.dbpr.construction",
  "sourceUrl": "https://www2.myfloridalicense.com/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv",
  "objectKey": "us/fl/dbpr/2026-07-10/construction-license.csv",
  "filePath": "/var/lib/opentrade/staging/construction-license.csv",
  "fetchedAt": "2026-07-10T12:00:00.000Z",
  "contentType": "text/csv",
  "strict": true,
  "publication": {
    "disposition": "review_required",
    "rawRecordDisposition": "withheld",
    "reviewedAt": "2026-07-10T12:00:00.000Z"
  },
  "sensitivity": {
    "level": "unknown",
    "containsHomeAddress": "unknown",
    "containsPersonalEmail": "unknown",
    "containsPersonalPhone": "unknown"
  }
}
```

Run it inside the worker image. The command archives the staged bytes under `objectKey` before enqueueing the database job:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml --profile worker run --rm \
  ingestion-worker node dist/enqueue-main.js \
  --request /var/lib/opentrade/staging/import-request.json
```

The command loads source-host and adapter authority from the checked-in registry and installed adapter package. The request cannot provide its own allowlist, adapter identity, adapter version, or trusted archive evidence. A source whose redistribution status is not `allowed` cannot request `allowed` publication. The command also requires HTTPS, a normalized relative object key, a regular staging file confined below `OPENTRADE_SNAPSHOT_ROOT`, and a configured size ceiling.

Before database access, the command writes the object to the configured private S3-compatible bucket using a conditional create. An existing key is reused only when its byte length, source metadata, metadata SHA-256, and server-reported SHA-256 all match the staged file. A conflicting key or checksum mismatch stops enqueue. The verified bucket, key, digest, object version, ETag, timestamps, and byte count are persisted in trusted snapshot metadata. The worker then re-verifies both the staging digest and archive object before parsing and immediately before promotion.

## Failure And Privacy Rules

- A warning does not silently become a licensing conclusion.
- A malformed row can be isolated only when the import policy permits partial ingestion; unresolved errors block promotion.
- Schema drift blocks promotion until the adapter or source review is updated.
- Raw source snapshots remain private, checksum-linked, and outside git, Vercel, and Supabase metadata storage.
- Publication disposition and sensitivity policy are evaluated before records become visible through hosted APIs.

The Compose worker profile includes a private storage monitor. It writes an atomic capacity observation from the MinIO volume; enqueue and promotion require a fresh, schema-valid observation using the same configured thresholds. Warning observations remain visible in import results, while critical, stale, missing, malformed, future-dated, or threshold-mismatched observations fail closed.

The Compose stack and recovery runbook remain deployment work. Until container startup, backup, restore, restart, alert-delivery, and controlled disk-pressure drills pass on the host, the private record platform is a foundation rather than a production service. Before enabling a source handler, add its fixture/conformance tests, wire it to manifest staging and promotion, and document its source-specific operational and privacy checks.
