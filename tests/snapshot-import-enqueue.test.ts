import { mkdir, mkdtemp, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { enqueueSnapshotImport } from "../services/ingestion-worker/src/enqueue.js";
import { inspectSnapshotFile } from "../services/ingestion-worker/src/snapshot-file.js";
import type { WorkerSqlClient } from "../services/ingestion-worker/src/worker.js";

describe("snapshot file inspection", () => {
  it("hashes a regular file inside the configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "opentrade-snapshot-"));
    const filePath = join(root, "sample.csv");
    await writeFile(filePath, "license,status\nABC123,active\n");
    const result = await inspectSnapshotFile({ filePath, allowedRoot: root, maxBytes: 1_024 });
    expect(result.filePath).toBe(await realpath(filePath));
    expect(result.bytes).toBe(29);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects traversal through a symlink and oversized files", async () => {
    const root = await mkdtemp(join(tmpdir(), "opentrade-root-"));
    const outside = await mkdtemp(join(tmpdir(), "opentrade-outside-"));
    const outsideFile = join(outside, "source.csv");
    await writeFile(outsideFile, "sensitive");
    await symlink(outsideFile, join(root, "escaped.csv"));
    await expect(inspectSnapshotFile({ filePath: join(root, "escaped.csv"), allowedRoot: root, maxBytes: 100 })).rejects.toThrow("outside");

    const largeFile = join(root, "large.csv");
    await writeFile(largeFile, "12345");
    await expect(inspectSnapshotFile({ filePath: largeFile, allowedRoot: root, maxBytes: 4 })).rejects.toThrow("exceeds");
  });

  it("rejects directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "opentrade-directory-"));
    const directory = join(root, "not-a-file");
    await mkdir(directory);
    await expect(inspectSnapshotFile({ filePath: directory, allowedRoot: root, maxBytes: 100 })).rejects.toThrow("regular file");
  });
});

describe("snapshot import enqueue", () => {
  it("validates source boundaries and calls the transactional function with parameters", async () => {
    const query = vi.fn(async () => ({ rows: [{
      snapshot_database_id: "17",
      snapshot_public_id: "snapshot-public-1",
      job_database_id: "31",
      job_public_id: "job-public-1",
      job_status: "pending",
      snapshot_created: true,
      job_created: true,
    }] }));
    const inspectFile = vi.fn(async () => ({ filePath: "/snapshots/fl.csv", sha256: "a".repeat(64), bytes: 42 }));
    const result = await enqueueSnapshotImport({
      sql: { query } as WorkerSqlClient,
      request: request(),
      allowedRoot: "/snapshots",
      maxBytes: 1_024,
      inspectFile,
    });
    expect(result).toMatchObject({ snapshotDatabaseId: 17, jobDatabaseId: 31, sha256: "a".repeat(64), bytes: 42, jobCreated: true });
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain("opentrade.enqueue_snapshot_import");
    expect(sql).not.toContain("us.fl.dbpr.construction");
    expect(values[0]).toBe("us.fl.dbpr.construction");
    expect(values[3]).toBe("a".repeat(64));
    expect(values[13]).toBe("/snapshots/fl.csv");
  });

  it("rejects non-HTTPS, non-allowlisted hosts, and unsafe object keys before database access", async () => {
    const query = vi.fn();
    const common = { sql: { query } as WorkerSqlClient, allowedRoot: "/snapshots", maxBytes: 1_024, inspectFile: vi.fn() };
    await expect(enqueueSnapshotImport({ ...common, request: request({ sourceUrl: "http://data.example.gov/file.csv" }) })).rejects.toThrow("HTTPS");
    await expect(enqueueSnapshotImport({ ...common, request: request({ sourceUrl: "https://evil.example/file.csv" }) })).rejects.toThrow("not allowlisted");
    await expect(enqueueSnapshotImport({ ...common, request: request({ objectKey: "../escape.csv" }) })).rejects.toThrow("object key");
    expect(query).not.toHaveBeenCalled();
  });
});

function request(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: "us.fl.dbpr.construction",
    sourceUrl: "https://data.example.gov/file.csv",
    allowedSourceHosts: ["data.example.gov"],
    objectKey: "us/fl/dbpr/a.csv",
    filePath: "/snapshots/fl.csv",
    fetchedAt: "2026-07-10T12:00:00.000Z",
    adapterPackage: "@opentrade-registry/adapter-fl-dbpr",
    adapterVersion: "1.0.1",
    strict: true,
    publication: { disposition: "review_required", rawRecordDisposition: "withheld", reviewedAt: "2026-07-10T12:00:00.000Z" },
    sensitivity: { level: "unknown", containsHomeAddress: "unknown", containsPersonalEmail: "unknown", containsPersonalPhone: "unknown" },
    ...overrides,
  };
}
