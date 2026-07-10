import { runSnapshotEnqueueCommand } from "./enqueue-command.js";

try {
  const result = await runSnapshotEnqueueCommand(process.argv.slice(2), { environment: process.env });
  console.log(JSON.stringify({ event: "snapshot_import_enqueued", ...result }));
} catch (error) {
  console.error(JSON.stringify({
    event: "snapshot_import_enqueue_failed",
    message: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
}
