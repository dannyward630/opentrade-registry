-- v1 keeps hosted infrastructure metadata-only. Canonical records and import
-- manifests remain in local files or the optional local SQLite cache.
drop table if exists public.license_records;
drop table if exists public.import_runs;
