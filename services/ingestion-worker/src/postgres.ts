import { Pool } from "pg";
import type { WorkerSqlClient } from "./worker.js";

export type PostgresWorkerClient = WorkerSqlClient & {
  close: () => Promise<void>;
};

export function createPostgresWorkerClient(databaseUrl: string): PostgresWorkerClient {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  return {
    async query(sql, values) {
      const result = await pool.query(sql, values ? [...values] : []);
      return { rows: result.rows as Array<Record<string, unknown>> };
    },
    close: () => pool.end(),
  };
}
