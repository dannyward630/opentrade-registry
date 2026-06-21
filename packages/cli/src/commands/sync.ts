import { requireAdapter } from "../adapters.js";
import { parseSyncFormat } from "../import/export.js";
import { downloadSourceToTempFile } from "../import/network.js";
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

  if (input.url && !input.allowNetwork) {
    throw Object.assign(new Error("Network sync requires --allow-network. Use --file for local sync."), { exitCode: 3 });
  }

  if (input.allowNetwork && !input.url) {
    throw Object.assign(new Error("Missing --url for network sync."), { exitCode: 2 });
  }

  if (!input.file && !input.url) {
    throw Object.assign(new Error("Missing --file for local-file sync."), { exitCode: 2 });
  }

  if (!input.out) {
    throw Object.assign(new Error("Missing --out for sync output."), { exitCode: 2 });
  }

  const format = parseSyncFormat(input.format);
  const downloaded = input.url ? await downloadSourceToTempFile(input.url) : null;

  try {
    const result = await runAdapterSync({
      adapter,
      rootDir: input.rootDir,
      filePath: downloaded?.filePath ?? input.file!,
      outPath: input.out,
      format,
      sourceLastModifiedAt: input.sourceLastModifiedAt ?? downloaded?.metadata.lastModifiedAt,
      fetchedAt: downloaded?.metadata.fetchedAt,
      remoteSnapshot: downloaded?.metadata,
    });
    console.log(input.json ? JSON.stringify(result, null, 2) : `Wrote ${result.stats.normalizedRecordCount} ${format.toUpperCase()} canonical records to ${result.outputPath}.`);
  } finally {
    await downloaded?.cleanup();
  }
}
