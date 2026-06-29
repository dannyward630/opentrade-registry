begin;

create extension if not exists pg_trgm;
create schema if not exists opentrade;
revoke all on schema opentrade from public;

create table opentrade.source_snapshots (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  source_id text not null,
  source_url text not null,
  object_key text not null unique,
  sha256 text not null unique check (sha256 ~ '^[a-f0-9]{64}$'),
  compressed_bytes bigint not null check (compressed_bytes >= 0),
  uncompressed_bytes bigint check (uncompressed_bytes >= 0),
  content_type text,
  etag text,
  last_modified_at timestamptz,
  fetched_at timestamptz not null,
  archived_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index source_snapshots_source_fetched_idx
  on opentrade.source_snapshots (source_id, fetched_at desc);

create table opentrade.import_manifests (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  source_id text not null,
  source_snapshot_id bigint not null references opentrade.source_snapshots(id),
  schema_version text not null,
  adapter_package text not null,
  adapter_version text not null,
  status text not null check (status in ('pending', 'processing', 'validated', 'promoted', 'failed', 'rejected')),
  raw_record_count bigint not null default 0 check (raw_record_count >= 0),
  normalized_record_count bigint not null default 0 check (normalized_record_count >= 0),
  duplicate_record_count bigint not null default 0 check (duplicate_record_count >= 0),
  warning_count bigint not null default 0 check (warning_count >= 0),
  error_count bigint not null default 0 check (error_count >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  promoted_at timestamptz,
  failure jsonb,
  metadata jsonb not null default '{}'::jsonb,
  unique (source_id, source_snapshot_id, adapter_package, adapter_version)
);

create index import_manifests_source_started_idx
  on opentrade.import_manifests (source_id, started_at desc);
create index import_manifests_active_idx
  on opentrade.import_manifests (status, started_at)
  where status in ('pending', 'processing', 'validated');
create index import_manifests_snapshot_id_idx
  on opentrade.import_manifests (source_snapshot_id);

create table opentrade.record_versions (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  import_manifest_id bigint not null references opentrade.import_manifests(id) on delete restrict,
  source_snapshot_id bigint not null references opentrade.source_snapshots(id) on delete restrict,
  source_id text not null,
  source_record_key text not null,
  record_version text not null,
  schema_version text not null,
  jurisdiction_state text not null check (jurisdiction_state ~ '^[A-Z]{2}$'),
  license_number text not null,
  license_number_normalized text not null,
  business_name text,
  licensee_name text,
  normalized_status text not null,
  trade_categories text[] not null default '{}',
  observed_at timestamptz not null,
  publication_disposition text not null check (publication_disposition in ('allowed', 'review_required', 'restricted', 'withheld')),
  sensitivity_level text not null check (sensitivity_level in ('business_only', 'personal_contact', 'sensitive_personal_data', 'unknown')),
  fingerprint text not null,
  canonical_record jsonb not null,
  created_at timestamptz not null default now(),
  unique (import_manifest_id, source_record_key)
);

create index record_versions_manifest_id_idx
  on opentrade.record_versions (import_manifest_id);
create index record_versions_snapshot_id_idx
  on opentrade.record_versions (source_snapshot_id);
create index record_versions_source_key_created_idx
  on opentrade.record_versions (source_id, source_record_key, created_at desc);

create table opentrade.current_records (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  source_id text not null,
  source_record_key text not null,
  record_version_id bigint not null references opentrade.record_versions(id) on delete restrict,
  import_manifest_id bigint not null references opentrade.import_manifests(id) on delete restrict,
  jurisdiction_state text not null,
  license_number text not null,
  license_number_normalized text not null,
  business_name text,
  licensee_name text,
  normalized_status text not null,
  trade_categories text[] not null default '{}',
  observed_at timestamptz not null,
  publication_disposition text not null,
  sensitivity_level text not null,
  fingerprint text not null,
  canonical_record jsonb not null,
  promoted_at timestamptz not null default now(),
  unique (source_id, source_record_key)
);

create index current_records_source_license_idx
  on opentrade.current_records (source_id, license_number_normalized);
create index current_records_state_status_idx
  on opentrade.current_records (jurisdiction_state, normalized_status);
create index current_records_observed_idx
  on opentrade.current_records (source_id, observed_at desc);
create index current_records_trade_categories_idx
  on opentrade.current_records using gin (trade_categories);
create index current_records_business_name_trgm_idx
  on opentrade.current_records using gin (business_name gin_trgm_ops)
  where business_name is not null;
create index current_records_version_id_idx
  on opentrade.current_records (record_version_id);
create index current_records_manifest_id_idx
  on opentrade.current_records (import_manifest_id);

create table opentrade.record_changes (
  id bigint generated always as identity primary key,
  import_manifest_id bigint not null references opentrade.import_manifests(id) on delete restrict,
  source_id text not null,
  source_record_key text not null,
  change_type text not null check (change_type in ('added', 'changed', 'removed')),
  previous_record_version_id bigint references opentrade.record_versions(id) on delete restrict,
  next_record_version_id bigint references opentrade.record_versions(id) on delete restrict,
  detected_at timestamptz not null default now(),
  unique (import_manifest_id, source_record_key, change_type)
);

create index record_changes_manifest_id_idx
  on opentrade.record_changes (import_manifest_id);
create index record_changes_source_detected_idx
  on opentrade.record_changes (source_id, detected_at desc);
create index record_changes_previous_version_idx
  on opentrade.record_changes (previous_record_version_id)
  where previous_record_version_id is not null;
create index record_changes_next_version_idx
  on opentrade.record_changes (next_record_version_id)
  where next_record_version_id is not null;

create table opentrade.source_health (
  id bigint generated always as identity primary key,
  source_id text not null,
  import_manifest_id bigint references opentrade.import_manifests(id) on delete set null,
  status text not null check (status in ('healthy', 'stale', 'degraded', 'unavailable', 'blocked')),
  checked_at timestamptz not null,
  record_count bigint check (record_count >= 0),
  count_delta_ratio numeric check (count_delta_ratio >= 0),
  schema_drift jsonb,
  details jsonb not null default '{}'::jsonb
);

create index source_health_source_checked_idx
  on opentrade.source_health (source_id, checked_at desc);
create index source_health_manifest_id_idx
  on opentrade.source_health (import_manifest_id)
  where import_manifest_id is not null;

create table opentrade.worker_jobs (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  queue text not null,
  kind text not null,
  source_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority smallint not null default 0,
  attempts smallint not null default 0 check (attempts >= 0),
  max_attempts smallint not null default 5 check (max_attempts > 0),
  scheduled_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index worker_jobs_claim_idx
  on opentrade.worker_jobs (queue, priority desc, scheduled_at, id)
  where status = 'pending';
create index worker_jobs_source_created_idx
  on opentrade.worker_jobs (source_id, created_at desc)
  where source_id is not null;

create table opentrade.lookup_cache (
  id bigint generated always as identity primary key,
  source_id text not null,
  query_hash text not null,
  result_status text not null,
  result jsonb not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (source_id, query_hash)
);

create index lookup_cache_expiry_idx on opentrade.lookup_cache (expires_at);

create table opentrade.developer_api_keys (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  supabase_user_id uuid not null,
  name text not null,
  key_prefix text not null unique,
  secret_hash bytea not null,
  quota_per_day integer not null default 1000 check (quota_per_day > 0),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index developer_api_keys_user_created_idx
  on opentrade.developer_api_keys (supabase_user_id, created_at desc);
create index developer_api_keys_active_prefix_idx
  on opentrade.developer_api_keys (key_prefix)
  where revoked_at is null;

create table opentrade.api_usage_daily (
  api_key_id bigint not null references opentrade.developer_api_keys(id) on delete cascade,
  usage_date date not null,
  request_count bigint not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (api_key_id, usage_date)
);

create function opentrade.claim_worker_job(p_queue text, p_worker_id text)
returns setof opentrade.worker_jobs
language sql
as $$
  update opentrade.worker_jobs
  set status = 'processing',
      attempts = attempts + 1,
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  where id = (
    select id
    from opentrade.worker_jobs
    where queue = p_queue
      and status = 'pending'
      and scheduled_at <= now()
      and attempts < max_attempts
    order by priority desc, scheduled_at, id
    limit 1
    for update skip locked
  )
  returning *;
$$;

create function opentrade.promote_import(p_import_manifest_id bigint)
returns void
language plpgsql
as $$
declare
  v_source_id text;
  v_status text;
begin
  select source_id, status
  into v_source_id, v_status
  from opentrade.import_manifests
  where id = p_import_manifest_id
  for update;

  if v_source_id is null then
    raise exception 'Unknown import manifest %', p_import_manifest_id;
  end if;
  if v_status <> 'validated' then
    raise exception 'Import manifest % must be validated before promotion', p_import_manifest_id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_source_id, 0));

  insert into opentrade.record_changes (
    import_manifest_id, source_id, source_record_key, change_type,
    previous_record_version_id, next_record_version_id
  )
  select
    p_import_manifest_id,
    next.source_id,
    next.source_record_key,
    case when current.id is null then 'added' else 'changed' end,
    current.record_version_id,
    next.id
  from opentrade.record_versions next
  left join opentrade.current_records current
    on current.source_id = next.source_id
   and current.source_record_key = next.source_record_key
  where next.import_manifest_id = p_import_manifest_id
    and (current.id is null or current.fingerprint <> next.fingerprint);

  insert into opentrade.record_changes (
    import_manifest_id, source_id, source_record_key, change_type,
    previous_record_version_id, next_record_version_id
  )
  select
    p_import_manifest_id,
    current.source_id,
    current.source_record_key,
    'removed',
    current.record_version_id,
    null
  from opentrade.current_records current
  where current.source_id = v_source_id
    and not exists (
      select 1
      from opentrade.record_versions next
      where next.import_manifest_id = p_import_manifest_id
        and next.source_record_key = current.source_record_key
    );

  insert into opentrade.current_records (
    source_id, source_record_key, record_version_id, import_manifest_id,
    jurisdiction_state, license_number, license_number_normalized,
    business_name, licensee_name, normalized_status, trade_categories,
    observed_at, publication_disposition, sensitivity_level, fingerprint,
    canonical_record, promoted_at
  )
  select
    source_id, source_record_key, id, import_manifest_id,
    jurisdiction_state, license_number, license_number_normalized,
    business_name, licensee_name, normalized_status, trade_categories,
    observed_at, publication_disposition, sensitivity_level, fingerprint,
    canonical_record, now()
  from opentrade.record_versions
  where import_manifest_id = p_import_manifest_id
  on conflict (source_id, source_record_key) do update set
    record_version_id = excluded.record_version_id,
    import_manifest_id = excluded.import_manifest_id,
    jurisdiction_state = excluded.jurisdiction_state,
    license_number = excluded.license_number,
    license_number_normalized = excluded.license_number_normalized,
    business_name = excluded.business_name,
    licensee_name = excluded.licensee_name,
    normalized_status = excluded.normalized_status,
    trade_categories = excluded.trade_categories,
    observed_at = excluded.observed_at,
    publication_disposition = excluded.publication_disposition,
    sensitivity_level = excluded.sensitivity_level,
    fingerprint = excluded.fingerprint,
    canonical_record = excluded.canonical_record,
    promoted_at = excluded.promoted_at;

  delete from opentrade.current_records current
  where current.source_id = v_source_id
    and current.import_manifest_id <> p_import_manifest_id;

  update opentrade.import_manifests
  set status = 'promoted', promoted_at = now(), finished_at = coalesce(finished_at, now())
  where id = p_import_manifest_id;
end;
$$;

revoke all on all tables in schema opentrade from public;
revoke all on all functions in schema opentrade from public;
revoke all on all sequences in schema opentrade from public;

commit;
