create index if not exists import_runs_source_id_idx
  on public.import_runs (source_id);

create index if not exists license_records_import_run_id_idx
  on public.license_records (import_run_id);

create policy "import_runs_no_public_access"
  on public.import_runs
  for all
  using (false)
  with check (false);
