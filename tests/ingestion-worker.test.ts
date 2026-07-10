import { describe, expect, it } from "vitest";
import { createIngestionWorker, type WorkerSqlClient } from "../services/ingestion-worker/src/worker.js";

const claimedRow = {
  id: 7,
  public_id: "job-7",
  queue: "ingestion",
  kind: "snapshot_import",
  source_id: "us.fl.dbpr.construction",
  status: "processing",
  attempts: 1,
  max_attempts: 5,
  payload: { manifestId: 42 },
};

describe("ingestion worker lifecycle", () => {
  it("claims, dispatches, heartbeats, and completes through stored procedures", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sql = fakeSql((query, values) => {
      calls.push({ sql: query, values });
      if (query.includes("claim_worker_job")) return [claimedRow];
      if (query.includes("heartbeat_worker_job")) return [{ ok: true }];
      if (query.includes("complete_worker_job")) return [{ ...claimedRow, status: "completed" }];
      throw new Error(`Unexpected query: ${query}`);
    });

    const worker = createIngestionWorker({
      sql,
      queue: "ingestion",
      workerId: "test-worker",
      handlers: {
        snapshot_import: async (job, context) => {
          expect(job.payload).toEqual({ manifestId: 42 });
          await context.heartbeat();
          return { manifestId: 42, promoted: false };
        },
      },
    });

    const result = await worker.runOnce();

    expect(result.outcome).toBe("completed");
    expect(calls.map((call) => call.sql)).toEqual([
      "select * from opentrade.claim_worker_job($1, $2)",
      "select opentrade.heartbeat_worker_job($1, $2) as ok",
      "select * from opentrade.complete_worker_job($1, $2, $3::jsonb)",
    ]);
    expect(calls[0]?.values).toEqual(["ingestion", "test-worker"]);
    expect(calls[1]?.values).toEqual([7, "test-worker"]);
    expect(calls[2]?.values).toEqual([7, "test-worker", JSON.stringify({ manifestId: 42, promoted: false })]);
  });

  it("records unsupported job kinds through the failure procedure", async () => {
    const calls: string[] = [];
    const sql = fakeSql((query) => {
      calls.push(query);
      if (query.includes("claim_worker_job")) return [claimedRow];
      if (query.includes("fail_worker_job")) return [{ ...claimedRow, status: "failed" }];
      throw new Error(`Unexpected query: ${query}`);
    });

    const result = await createIngestionWorker({
      sql,
      queue: "ingestion",
      workerId: "test-worker",
    }).runOnce();

    expect(result).toMatchObject({
      outcome: "failed",
      error: {
        name: "UnsupportedWorkerJobError",
        message: "No handler is registered for worker job kind: snapshot_import",
      },
    });
    expect(calls).toEqual([
      "select * from opentrade.claim_worker_job($1, $2)",
      "select * from opentrade.fail_worker_job($1, $2, $3::jsonb)",
    ]);
  });

  it("returns idle without dispatching when no job is available", async () => {
    const calls: string[] = [];
    const sql = fakeSql((query) => {
      calls.push(query);
      return [];
    });

    const result = await createIngestionWorker({
      sql,
      queue: "ingestion",
      workerId: "test-worker",
    }).runOnce();

    expect(result).toEqual({ outcome: "idle", queue: "ingestion" });
    expect(calls).toEqual(["select * from opentrade.claim_worker_job($1, $2)"]);
  });
});

function fakeSql(responder: (query: string, values: readonly unknown[]) => Array<Record<string, unknown>>): WorkerSqlClient {
  return {
    async query(query, values = []) {
      return { rows: responder(query, values) };
    },
  };
}
