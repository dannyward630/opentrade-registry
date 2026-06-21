import { requireAdapter } from "../adapters.js";
import { parseSyncFormat } from "../import/export.js";
import { runAdapterSync } from "../import/sync-runner.js";

export async function syncSource(input: {
  rootDir: string;
  sourceId: string;
  file?: string;
  out?: string;
  format?: string;
  url?: string;
  allowNetwork?: boolean;
  sourceLastModifiedAt?: string;
  json?: boolean;
}) {
  const adapter = requireAdapter(input.sourceId, "sync");

  if (input.url || input.allowNetwork) {
    throw Object.assign(
      new Error("Network sync is planned for a future release. v0.1 requires --file and does not download source data."),
      { exitCode: 3 },
    );
  }

  if (!input.file) {
    throw Object.assign(new Error("Missing --file for local-file sync."), { exitCode: 2 });
  }

  if (!input.out) {
    throw Object.assign(new Error("Missing --out for sync output."), { exitCode: 2 });
  }

  const format = parseSyncFormat(input.format);
  const result = await runAdapterSync({
    adapter,
    rootDir: input.rootDir,
    filePath: input.file,
    outPath: input.out,
    format,
    sourceLastModifiedAt: input.sourceLastModifiedAt,
  });
  console.log(input.json ? JSON.stringify(result, null, 2) : `Wrote ${result.stats.normalizedRecordCount} ${format.toUpperCase()} canonical records to ${result.outputPath}.`);
}
