begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'opentrade_api') then
    create role opentrade_api nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'opentrade_worker') then
    create role opentrade_worker nologin;
  end if;
end
$$;

grant usage on schema opentrade to opentrade_api, opentrade_worker;

grant select on opentrade.current_records to opentrade_api;
grant select on opentrade.record_versions to opentrade_api;
grant select on opentrade.record_changes to opentrade_api;
grant select on opentrade.source_snapshots to opentrade_api;
grant select on opentrade.import_manifests to opentrade_api;
grant select on opentrade.source_health to opentrade_api;
grant select, insert, update on opentrade.lookup_cache to opentrade_api;
grant select, insert, update on opentrade.developer_api_keys to opentrade_api;
grant select, insert, update on opentrade.api_usage_daily to opentrade_api;
grant select, insert on opentrade.worker_jobs to opentrade_api;
grant usage, select on all sequences in schema opentrade to opentrade_api;

grant select, insert, update on opentrade.source_snapshots to opentrade_worker;
grant select, insert, update on opentrade.import_manifests to opentrade_worker;
grant select, insert on opentrade.record_versions to opentrade_worker;
grant select, insert, update, delete on opentrade.current_records to opentrade_worker;
grant select, insert on opentrade.record_changes to opentrade_worker;
grant select, insert on opentrade.source_health to opentrade_worker;
grant select, insert, update on opentrade.worker_jobs to opentrade_worker;
grant select, insert, update, delete on opentrade.lookup_cache to opentrade_worker;
grant usage, select on all sequences in schema opentrade to opentrade_worker;
grant execute on function opentrade.claim_worker_job(text, text) to opentrade_worker;
grant execute on function opentrade.promote_import(bigint) to opentrade_worker;

commit;
