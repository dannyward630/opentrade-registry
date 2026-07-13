import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("self-hosted Compose security", () => {
  it("binds database and object storage only to loopback", async () => {
    const compose = await readFile(join(process.cwd(), "infra", "compose.yaml"), "utf8");
    expect(compose).toContain('"127.0.0.1:${POSTGRES_PORT:-5432}:5432"');
    expect(compose).toContain('"127.0.0.1:${MINIO_API_PORT:-9000}:9000"');
    expect(compose).toContain('"127.0.0.1:${MINIO_CONSOLE_PORT:-9001}:9001"');
    expect(compose).toContain('"127.0.0.1:${RECORD_API_PORT:-8787}:8787"');
    expect(compose).not.toMatch(/-\s*["']?(?:0\.0\.0\.0:)?(?:5432|9000|9001):/);
    expect(compose).toContain("internal: true");
  });

  it("does not commit deployment credentials", async () => {
    const environment = await readFile(join(process.cwd(), "infra", ".env.example"), "utf8");
    expect(environment).toContain("change-me-before-first-start");
    expect(environment).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}|sb_secret_|service_role/i);
  });

  it("keeps the worker opt-in and requires a separate database credential", async () => {
    const compose = await readFile(join(process.cwd(), "infra", "compose.yaml"), "utf8");
    const workerService = compose.slice(compose.indexOf("  ingestion-worker:"));
    expect(compose).toContain("profiles: [\"worker\"]");
    expect(compose).toContain("DATABASE_URL: ${WORKER_DATABASE_URL:?set WORKER_DATABASE_URL in infra/.env}");
    expect(compose).toContain("OPENTRADE_WORKER_HEARTBEAT_INTERVAL_MS");
    expect(workerService).not.toContain("DATABASE_URL: postgresql://${POSTGRES_USER");
    expect(workerService).toContain("SNAPSHOT_ARCHIVE_ACCESS_KEY_ID: ${MINIO_WORKER_USER");
    expect(workerService).toContain("SNAPSHOT_ARCHIVE_SECRET_ACCESS_KEY: ${MINIO_WORKER_PASSWORD");
    expect(workerService).not.toContain("MINIO_ROOT_PASSWORD");
  });

  it("provisions a versioned private bucket with a non-destructive worker boundary", async () => {
    const compose = await readFile(join(process.cwd(), "infra", "compose.yaml"), "utf8");
    expect(compose).toContain('mc anonymous set none "local/$${SNAPSHOT_BUCKET}"');
    expect(compose).toContain('mc version enable "local/$${SNAPSHOT_BUCKET}"');
    expect(compose).toContain("opentrade-snapshot-writer");
    expect(compose).toContain("s3:GetObject");
    expect(compose).toContain("s3:PutObject");
    expect(compose).not.toContain("s3:DeleteObject");
  });

  it("monitors the snapshot volume without network or write access to snapshots", async () => {
    const compose = await readFile(join(process.cwd(), "infra", "compose.yaml"), "utf8");
    const monitorService = compose.slice(compose.indexOf("  storage-monitor:"), compose.indexOf("  ingestion-worker:"));
    expect(monitorService).toContain("network_mode: none");
    expect(monitorService).toContain("read_only: true");
    expect(monitorService).toContain("cap_drop:");
    expect(monitorService).toContain("- ALL");
    expect(monitorService).toContain("no-new-privileges:true");
    expect(monitorService).toContain("snapshot-data:/var/lib/opentrade/snapshots:ro");
    expect(monitorService).toContain("runtime-state:/var/run/opentrade");
    expect(monitorService).not.toContain("DATABASE_URL");
    expect(monitorService).not.toContain("MINIO_ROOT_PASSWORD");
    expect(monitorService).not.toContain("SNAPSHOT_ARCHIVE_SECRET_ACCESS_KEY");
  });

  it("requires fresh shared storage health before starting ingestion", async () => {
    const compose = await readFile(join(process.cwd(), "infra", "compose.yaml"), "utf8");
    const workerService = compose.slice(compose.indexOf("  ingestion-worker:"));
    expect(workerService).toContain("storage-monitor:");
    expect(workerService).toContain("condition: service_healthy");
    expect(workerService).toContain("OPENTRADE_STORAGE_HEALTH_FILE: /var/run/opentrade/storage-health.json");
    expect(workerService).toContain("OPENTRADE_STORAGE_STATUS_MAX_AGE_MS");
    expect(workerService).toContain("OPENTRADE_DISK_WARN_FREE_PERCENT");
    expect(workerService).toContain("OPENTRADE_DISK_STOP_FREE_PERCENT");
    expect(workerService).toContain("runtime-state:/var/run/opentrade:ro");
  });
});
