import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("v2 Postgres record schema", () => {
  it("defines immutable snapshots, versioned records, atomic promotion, and worker locking", async () => {
    const sql = await readFile(join(process.cwd(), "infra/postgres/migrations/0001_v2_record_platform.sql"), "utf8");
    for (const table of [
      "source_snapshots",
      "import_manifests",
      "record_versions",
      "current_records",
      "record_changes",
      "source_health",
      "worker_jobs",
      "lookup_cache",
      "developer_api_keys",
      "api_usage_daily",
    ]) {
      expect(sql).toContain(`create table opentrade.${table}`);
    }
    expect(sql).toContain("create function opentrade.promote_import");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("using gin (business_name gin_trgm_ops)");
    expect(sql).toContain("revoke all on schema opentrade from public");
    expect(sql).not.toMatch(/api_key\s+text/i);
  });

  it("grants separate least-privilege API and worker roles", async () => {
    const sql = await readFile(join(process.cwd(), "infra/postgres/migrations/0002_service_roles.sql"), "utf8");
    expect(sql).toContain("create role opentrade_api nologin");
    expect(sql).toContain("create role opentrade_worker nologin");
    expect(sql).toContain("grant select on opentrade.current_records");
    expect(sql).not.toContain("grant all privileges on all tables");
    expect(sql).not.toContain("superuser");
  });

  it("defines worker heartbeat, cancellation, stale recovery, and dead-letter transitions", async () => {
    const sql = await readFile(join(process.cwd(), "infra/postgres/migrations/0003_ingestion_worker_hardening.sql"), "utf8");
    expect(sql).toContain("heartbeat_at timestamptz");
    expect(sql).toContain("cancel_requested_at timestamptz");
    expect(sql).toContain("dead_lettered_at timestamptz");
    expect(sql).toContain("status = 'processing' and heartbeat_at < now() - interval '5 minutes'");
    expect(sql).toContain("create or replace function opentrade.heartbeat_worker_job");
    expect(sql).toContain("create or replace function opentrade.request_worker_job_cancel");
    expect(sql).toContain("create or replace function opentrade.fail_worker_job");
    expect(sql).toContain("'dead_letter'");
    expect(sql).toContain("grant execute on function opentrade.fail_worker_job");
  });
});
