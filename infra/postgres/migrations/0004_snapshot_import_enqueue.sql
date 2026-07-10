begin;

alter table opentrade.source_snapshots
  drop constraint if exists source_snapshots_sha256_key;

create unique index if not exists source_snapshots_source_sha256_idx
  on opentrade.source_snapshots (source_id, sha256);

create unique index if not exists worker_jobs_snapshot_import_idx
  on opentrade.worker_jobs (
    source_id,
    (payload ->> 'sourceSnapshotDatabaseId'),
    (payload ->> 'adapterPackage'),
    (payload ->> 'adapterVersion')
  )
  where kind = 'snapshot_import';

create or replace function opentrade.enqueue_snapshot_import(
  p_source_id text,
  p_source_url text,
  p_object_key text,
  p_sha256 text,
  p_compressed_bytes bigint,
  p_uncompressed_bytes bigint,
  p_content_type text,
  p_etag text,
  p_last_modified_at timestamptz,
  p_fetched_at timestamptz,
  p_snapshot_metadata jsonb,
  p_adapter_package text,
  p_adapter_version text,
  p_file_path text,
  p_strict boolean,
  p_import_policy jsonb
)
returns table (
  snapshot_database_id bigint,
  snapshot_public_id uuid,
  job_database_id bigint,
  job_public_id uuid,
  job_status text,
  snapshot_created boolean,
  job_created boolean
)
language plpgsql
as $$
declare
  v_snapshot opentrade.source_snapshots%rowtype;
  v_job opentrade.worker_jobs%rowtype;
  v_snapshot_created boolean := false;
  v_job_created boolean := false;
  v_payload jsonb;
begin
  if p_source_id is null or btrim(p_source_id) = '' then
    raise exception 'source ID is required';
  end if;
  if p_source_url is null or btrim(p_source_url) = '' then
    raise exception 'source URL is required';
  end if;
  if p_object_key is null or btrim(p_object_key) = '' then
    raise exception 'object key is required';
  end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'snapshot SHA-256 must be 64 lowercase hexadecimal characters';
  end if;
  if p_compressed_bytes < 0 or (p_uncompressed_bytes is not null and p_uncompressed_bytes < 0) then
    raise exception 'snapshot byte counts cannot be negative';
  end if;
  if p_adapter_package is null or btrim(p_adapter_package) = '' or p_adapter_version is null or btrim(p_adapter_version) = '' then
    raise exception 'adapter package and version are required';
  end if;
  if p_file_path is null or btrim(p_file_path) = '' then
    raise exception 'worker file path is required';
  end if;
  if jsonb_typeof(coalesce(p_import_policy, '{}'::jsonb)) <> 'object' then
    raise exception 'import policy must be a JSON object';
  end if;

  insert into opentrade.source_snapshots (
    source_id, source_url, object_key, sha256, compressed_bytes,
    uncompressed_bytes, content_type, etag, last_modified_at, fetched_at, metadata
  ) values (
    p_source_id, p_source_url, p_object_key, p_sha256, p_compressed_bytes,
    p_uncompressed_bytes, p_content_type, p_etag, p_last_modified_at, p_fetched_at,
    coalesce(p_snapshot_metadata, '{}'::jsonb)
  )
  on conflict (source_id, sha256) do nothing
  returning * into v_snapshot;

  if found then
    v_snapshot_created := true;
  else
    select * into strict v_snapshot
    from opentrade.source_snapshots
    where source_id = p_source_id and sha256 = p_sha256
    for update;
  end if;

  if v_snapshot.object_key <> p_object_key then
    raise exception 'snapshot content is already registered for source % with object key %', p_source_id, v_snapshot.object_key;
  end if;

  v_payload := (coalesce(p_import_policy, '{}'::jsonb) - array[
    'sourceId', 'sourceUrl', 'sourceSnapshotId', 'sourceSnapshotDatabaseId',
    'fetchedAt', 'sourceLastModifiedAt', 'adapterPackage', 'adapterVersion',
    'filePath', 'strict', 'sha256'
  ]) || jsonb_build_object(
    'sourceId', p_source_id,
    'sourceUrl', v_snapshot.source_url,
    'sourceSnapshotId', v_snapshot.public_id::text,
    'sourceSnapshotDatabaseId', v_snapshot.id,
    'fetchedAt', to_char(v_snapshot.fetched_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'sourceLastModifiedAt', case
      when v_snapshot.last_modified_at is null then null
      else to_char(v_snapshot.last_modified_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'adapterPackage', p_adapter_package,
    'adapterVersion', p_adapter_version,
    'filePath', p_file_path,
    'strict', p_strict,
    'sha256', p_sha256
  );

  insert into opentrade.worker_jobs (queue, kind, source_id, payload)
  values ('ingestion', 'snapshot_import', p_source_id, v_payload)
  on conflict do nothing
  returning * into v_job;

  if found then
    v_job_created := true;
  else
    select * into strict v_job
    from opentrade.worker_jobs
    where kind = 'snapshot_import'
      and source_id = p_source_id
      and payload ->> 'sourceSnapshotDatabaseId' = v_snapshot.id::text
      and payload ->> 'adapterPackage' = p_adapter_package
      and payload ->> 'adapterVersion' = p_adapter_version;
  end if;

  return query select
    v_snapshot.id,
    v_snapshot.public_id,
    v_job.id,
    v_job.public_id,
    v_job.status,
    v_snapshot_created,
    v_job_created;
end;
$$;

grant execute on function opentrade.enqueue_snapshot_import(
  text, text, text, text, bigint, bigint, text, text, timestamptz, timestamptz,
  jsonb, text, text, text, boolean, jsonb
) to opentrade_worker;

commit;
