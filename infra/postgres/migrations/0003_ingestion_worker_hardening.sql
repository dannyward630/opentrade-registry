begin;

alter table opentrade.import_manifests
  drop constraint if exists import_manifests_status_check;

alter table opentrade.import_manifests
  add constraint import_manifests_status_check
  check (status in ('pending', 'processing', 'validated', 'promoted', 'failed', 'rejected', 'cancelled'));

alter table opentrade.import_manifests
  add column if not exists strict_mode boolean not null default false,
  add column if not exists schema_drift jsonb not null default '[]'::jsonb,
  add column if not exists cancelled_at timestamptz;

alter table opentrade.worker_jobs
  drop constraint if exists worker_jobs_status_check;

alter table opentrade.worker_jobs
  add constraint worker_jobs_status_check
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled', 'dead_letter'));

alter table opentrade.worker_jobs
  add column if not exists heartbeat_at timestamptz,
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists last_error jsonb;

create index if not exists worker_jobs_heartbeat_idx
  on opentrade.worker_jobs (heartbeat_at)
  where status = 'processing';

create index if not exists worker_jobs_dead_letter_idx
  on opentrade.worker_jobs (queue, dead_lettered_at desc)
  where status = 'dead_letter';

create or replace function opentrade.claim_worker_job(p_queue text, p_worker_id text)
returns setof opentrade.worker_jobs
language sql
as $$
  update opentrade.worker_jobs
  set status = 'processing',
      attempts = attempts + 1,
      locked_at = now(),
      heartbeat_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  where id = (
    select id
    from opentrade.worker_jobs
    where queue = p_queue
      and attempts < max_attempts
      and (
        (status = 'pending' and scheduled_at <= now())
        or (status = 'processing' and heartbeat_at < now() - interval '5 minutes')
      )
    order by priority desc, scheduled_at, id
    limit 1
    for update skip locked
  )
  returning *;
$$;

create or replace function opentrade.heartbeat_worker_job(p_job_id bigint, p_worker_id text)
returns boolean
language sql
as $$
  update opentrade.worker_jobs
  set heartbeat_at = now(), updated_at = now()
  where id = p_job_id
    and status = 'processing'
    and locked_by = p_worker_id
    and cancel_requested_at is null
  returning true;
$$;

create or replace function opentrade.request_worker_job_cancel(p_job_id bigint)
returns boolean
language sql
as $$
  update opentrade.worker_jobs
  set cancel_requested_at = coalesce(cancel_requested_at, now()), updated_at = now()
  where id = p_job_id
    and status in ('pending', 'processing')
  returning true;
$$;

create or replace function opentrade.complete_worker_job(p_job_id bigint, p_worker_id text, p_result jsonb default '{}'::jsonb)
returns setof opentrade.worker_jobs
language sql
as $$
  update opentrade.worker_jobs
  set status = case when cancel_requested_at is null then 'completed' else 'cancelled' end,
      completed_at = now(),
      result = p_result,
      updated_at = now()
  where id = p_job_id
    and status = 'processing'
    and locked_by = p_worker_id
  returning *;
$$;

create or replace function opentrade.fail_worker_job(p_job_id bigint, p_worker_id text, p_error jsonb)
returns setof opentrade.worker_jobs
language sql
as $$
  update opentrade.worker_jobs
  set status = case when attempts >= max_attempts then 'dead_letter' else 'failed' end,
      error = p_error,
      last_error = p_error,
      dead_lettered_at = case when attempts >= max_attempts then now() else null end,
      updated_at = now()
  where id = p_job_id
    and status = 'processing'
    and locked_by = p_worker_id
  returning *;
$$;

create or replace function opentrade.requeue_failed_worker_job(p_job_id bigint)
returns boolean
language sql
as $$
  update opentrade.worker_jobs
  set status = 'pending',
      scheduled_at = now(),
      locked_at = null,
      heartbeat_at = null,
      locked_by = null,
      updated_at = now()
  where id = p_job_id
    and status = 'failed'
    and attempts < max_attempts
  returning true;
$$;

grant execute on function opentrade.claim_worker_job(text, text) to opentrade_worker;
grant execute on function opentrade.heartbeat_worker_job(bigint, text) to opentrade_worker;
grant execute on function opentrade.request_worker_job_cancel(bigint) to opentrade_worker;
grant execute on function opentrade.complete_worker_job(bigint, text, jsonb) to opentrade_worker;
grant execute on function opentrade.fail_worker_job(bigint, text, jsonb) to opentrade_worker;
grant execute on function opentrade.requeue_failed_worker_job(bigint) to opentrade_worker;

commit;
