export type WorkerJobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "dead_letter";

export type ClaimedWorkerJob = {
  id: number;
  publicId: string;
  queue: string;
  kind: string;
  sourceId: string | null;
  status: WorkerJobStatus;
  attempts: number;
  maxAttempts: number;
  payload: unknown;
};

export type WorkerJobResult = Record<string, unknown>;

export type WorkerJobContext = {
  signal: AbortSignal;
  heartbeat: () => Promise<void>;
};

export type WorkerJobHandler = (
  job: ClaimedWorkerJob,
  context: WorkerJobContext,
) => Promise<WorkerJobResult>;

export type WorkerJobHandlers = Readonly<Record<string, WorkerJobHandler>>;

export interface WorkerSqlClient {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export type WorkerEvent =
  | { type: "claimed"; job: ClaimedWorkerJob }
  | { type: "completed"; job: ClaimedWorkerJob; result: WorkerJobResult }
  | { type: "failed"; job: ClaimedWorkerJob; error: WorkerErrorDetails }
  | { type: "idle"; queue: string };

export type WorkerErrorDetails = {
  name: string;
  message: string;
};

export type WorkerRunResult =
  | { outcome: "idle"; queue: string }
  | { outcome: "completed"; job: ClaimedWorkerJob; result: WorkerJobResult }
  | { outcome: "failed"; job: ClaimedWorkerJob; error: WorkerErrorDetails };

export type IngestionWorkerOptions = {
  sql: WorkerSqlClient;
  queue: string;
  workerId: string;
  handlers?: WorkerJobHandlers;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  onEvent?: (event: WorkerEvent) => void;
  sleep?: (milliseconds: number) => Promise<void>;
};

export class UnsupportedWorkerJobError extends Error {
  constructor(kind: string) {
    super(`No handler is registered for worker job kind: ${kind}`);
    this.name = "UnsupportedWorkerJobError";
  }
}

class WorkerCancellationError extends Error {
  constructor() {
    super("The worker job was cancelled by the database or shutdown signal.");
    this.name = "WorkerCancellationError";
  }
}

export function createIngestionWorker(options: IngestionWorkerOptions) {
  const handlers = options.handlers ?? {};
  const pollIntervalMs = positiveInteger(options.pollIntervalMs, 1_000);
  const heartbeatIntervalMs = positiveInteger(options.heartbeatIntervalMs, 30_000);
  const sleep = options.sleep ?? defaultSleep;

  return {
    async runOnce(signal?: AbortSignal): Promise<WorkerRunResult> {
      if (signal?.aborted) return { outcome: "idle", queue: options.queue };

      const job = await claimJob(options.sql, options.queue, options.workerId);
      if (!job) {
        const idle = { outcome: "idle" as const, queue: options.queue };
        options.onEvent?.({ type: "idle", queue: options.queue });
        return idle;
      }

      options.onEvent?.({ type: "claimed", job });
      const controller = new AbortController();
      const stopHandler = () => controller.abort(signal?.reason);
      signal?.addEventListener("abort", stopHandler, { once: true });
      const heartbeatTimer = setInterval(() => {
        void heartbeatJob(options.sql, job.id, options.workerId).then((ok) => {
          if (!ok) controller.abort(new WorkerCancellationError());
        }).catch((error: unknown) => {
          controller.abort(error instanceof Error ? error : new Error(String(error)));
        });
      }, heartbeatIntervalMs);

      try {
        const handler = handlers[job.kind];
        if (!handler) throw new UnsupportedWorkerJobError(job.kind);

        const result = await handler(job, {
          signal: controller.signal,
          heartbeat: async () => {
            const ok = await heartbeatJob(options.sql, job.id, options.workerId);
            if (!ok) {
              const error = new WorkerCancellationError();
              controller.abort(error);
              throw error;
            }
          },
        });

        await completeJob(options.sql, job.id, options.workerId, result);
        const completed = { outcome: "completed" as const, job, result };
        options.onEvent?.({ type: "completed", job, result });
        return completed;
      } catch (error) {
        const details = toWorkerError(error);
        await failJob(options.sql, job.id, options.workerId, details);
        const failed = { outcome: "failed" as const, job, error: details };
        options.onEvent?.({ type: "failed", job, error: details });
        return failed;
      } finally {
        clearInterval(heartbeatTimer);
        signal?.removeEventListener("abort", stopHandler);
      }
    },

    async runUntilStopped(signal: AbortSignal): Promise<void> {
      while (!signal.aborted) {
        const result = await this.runOnce(signal);
        if (result.outcome === "idle") await sleep(pollIntervalMs);
      }
    },
  };
}

async function claimJob(sql: WorkerSqlClient, queue: string, workerId: string): Promise<ClaimedWorkerJob | null> {
  const result = await sql.query(
    "select * from opentrade.claim_worker_job($1, $2)",
    [queue, workerId],
  );
  const row = result.rows[0];
  return row ? mapJob(row) : null;
}

async function heartbeatJob(sql: WorkerSqlClient, jobId: number, workerId: string): Promise<boolean> {
  const result = await sql.query(
    "select opentrade.heartbeat_worker_job($1, $2) as ok",
    [jobId, workerId],
  );
  return result.rows[0]?.ok === true;
}

async function completeJob(sql: WorkerSqlClient, jobId: number, workerId: string, result: WorkerJobResult): Promise<void> {
  await sql.query(
    "select * from opentrade.complete_worker_job($1, $2, $3::jsonb)",
    [jobId, workerId, JSON.stringify(result)],
  );
}

async function failJob(sql: WorkerSqlClient, jobId: number, workerId: string, error: WorkerErrorDetails): Promise<void> {
  await sql.query(
    "select * from opentrade.fail_worker_job($1, $2, $3::jsonb)",
    [jobId, workerId, JSON.stringify(error)],
  );
}

function mapJob(row: Record<string, unknown>): ClaimedWorkerJob {
  const id = numberValue(row.id, "id");
  const maxAttempts = numberValue(row.max_attempts, "max_attempts");
  return {
    id,
    publicId: stringValue(row.public_id, "public_id"),
    queue: stringValue(row.queue, "queue"),
    kind: stringValue(row.kind, "kind"),
    sourceId: nullableString(row.source_id),
    status: row.status as WorkerJobStatus,
    attempts: numberValue(row.attempts, "attempts"),
    maxAttempts,
    payload: row.payload,
  };
}

function toWorkerError(error: unknown): WorkerErrorDetails {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "UnknownWorkerError", message: String(error) };
}

function numberValue(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`Worker job field ${field} is invalid.`);
  return number;
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Worker job field ${field} is invalid.`);
  return value;
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
