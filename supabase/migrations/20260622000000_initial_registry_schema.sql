create extension if not exists pgcrypto;

create table if not exists public.registry_sources (
  id text primary key,
  name text not null,
  jurisdiction jsonb not null,
  agency jsonb not null,
  source_type text not null,
  source_url text not null,
  documentation_url text,
  adapter_status text not null,
  adapter_maturity text not null,
  source_discovery_status text not null,
  coverage_scope text not null,
  redistribution_status text not null,
  metadata jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.registry_sources(id) on delete restrict,
  status text not null check (status in ('started', 'completed', 'completed_with_warnings', 'failed')),
  adapter_maturity text not null,
  source_url text not null,
  source_last_modified_at timestamptz,
  source_etag text,
  content_length_bytes bigint,
  output_format text,
  output_path text,
  started_at timestamptz not null,
  finished_at timestamptz,
  raw_count integer not null default 0,
  normalized_count integer not null default 0,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.license_records (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.registry_sources(id) on delete restrict,
  import_run_id uuid references public.import_runs(id) on delete set null,
  jurisdiction jsonb not null,
  agency jsonb not null,
  source jsonb not null,
  license jsonb not null,
  identity jsonb not null default '{}'::jsonb,
  status jsonb not null,
  dates jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  compliance jsonb,
  raw_record jsonb not null,
  fingerprint text not null,
  license_number text not null,
  license_number_normalized text not null,
  normalized_status text not null,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, fingerprint)
);

create index if not exists license_records_source_normalized_license_idx
  on public.license_records (source_id, license_number_normalized);

create index if not exists license_records_source_status_idx
  on public.license_records (source_id, normalized_status);

create index if not exists license_records_fetched_at_idx
  on public.license_records (fetched_at desc);

alter table public.registry_sources enable row level security;
alter table public.import_runs enable row level security;
alter table public.license_records enable row level security;

create policy "registry_sources_public_read"
  on public.registry_sources
  for select
  using (true);

create policy "license_records_public_read"
  on public.license_records
  for select
  using (true);
