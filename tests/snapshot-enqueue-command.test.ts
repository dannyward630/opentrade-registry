import { describe, expect, it, vi } from "vitest";
import { parseRequestPath, runSnapshotEnqueueCommand } from "../services/ingestion-worker/src/enqueue-command.js";
import type { PostgresWorkerClient } from "../services/ingestion-worker/src/postgres.js";

describe("snapshot enqueue operator command", () => {
  it("requires exactly one request file", () => {
    expect(parseRequestPath(["--request", "/tmp/request.json"])).toBe("/tmp/request.json");
    expect(() => parseRequestPath([])).toThrow("Usage");
    expect(() => parseRequestPath(["--request", "a", "extra"])).toThrow("Usage");
  });

  it("closes the database client when enqueue validation fails", async () => {
    const close = vi.fn(async () => undefined);
    const query = vi.fn(async () => ({ rows: [] }));
    const client = { query, close } as PostgresWorkerClient;
    await expect(runSnapshotEnqueueCommand(["--request", "/request.json"], {
      environment: {
        DATABASE_URL: "postgresql://worker@example.invalid/opentrade",
        OPENTRADE_SNAPSHOT_ROOT: "/snapshots",
        OPENTRADE_REGISTRY_ROOT: "/registry",
        OPENTRADE_MAX_SNAPSHOT_BYTES: "1024",
      },
      readRequest: async () => ({ sourceId: "us.fl.example", invalid: true }),
      createClient: () => client,
      loadSourcePolicy: async () => ({ sourceId: "us.fl.example", allowedSourceHosts: ["example.gov"], adapterPackage: "@opentrade-registry/example", adapterVersion: "1.0.0", redistributionStatus: "unknown" }),
    })).rejects.toThrow();
    expect(close).toHaveBeenCalledOnce();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects missing environment before opening a database client", async () => {
    const createClient = vi.fn();
    await expect(runSnapshotEnqueueCommand(["--request", "/request.json"], {
      environment: {},
      readRequest: async () => ({}),
      createClient,
    })).rejects.toThrow("DATABASE_URL");
    expect(createClient).not.toHaveBeenCalled();
  });
});
