import { requireAdapter } from "../adapters.js";
import { parseSyncFormat } from "../import/export.js";
import { buildAllowedSourceHosts, downloadSourceToTempFile, resolveNetworkSourceUrl } from "../import/network.js";
import { runAdapterSync } from "../import/sync-runner.js";

export async function syncSource(input: {
  rootDir: string;
  sourceId: string;
  file?: string;
  out?: string;
  cache?: string;
  format?: string;
  url?: string;
  allowNetwork?: boolean;
  sourceLastModifiedAt?: string;
  json?: boolean;
  strict?: boolean;
  resumable?: boolean;
  checkpointInterval?: number;
  resumeFromRunId?: string;
}) {
  const adapter = requireAdapter(input.sourceId, "sync");

  if (input.url && !input.allowNetwork) {
    throw Object.assign(new Error("Network sync requires --allow-network. Use --file for local sync."), { exitCode: 3 });
  }

  if (!input.file && !input.allowNetwork) {
    throw Object.assign(new Error("Missing input. Use --file or explicitly opt into source resolution with --allow-network."), { exitCode: 2 });
  }

  if (!input.out && !input.cache) {
    throw Object.assign(new Error("Sync requires at least one destination: --out or --cache."), { exitCode: 2 });
  }

  if ((input.resumable || input.resumeFromRunId) && !input.cache) {
    throw Object.assign(new Error("Resumable sync requires --cache."), { exitCode: 2 });
  }

  if (input.resumeFromRunId && input.out) {
    throw Object.assign(new Error("Resumed sync is cache-only; omit --out."), { exitCode: 2 });
  }

  if (input.checkpointInterval !== undefined && (!Number.isInteger(input.checkpointInterval) || input.checkpointInterval < 1)) {
    throw Object.assign(new Error("--checkpoint-interval must be a positive integer."), { exitCode: 2 });
  }

  const format = parseSyncFormat(input.format);
  const metadata = await adapter.getSourceMetadata();
  const networkUrl = input.allowNetwork ? await resolveNetworkSourceUrl(metadata, input.url) : undefined;
  const downloaded = networkUrl
    ? await downloadSourceToTempFile(networkUrl, { allowedHosts: buildAllowedSourceHosts(metadata, networkUrl) })
    : null;

  try {
    const result = await runAdapterSync({
      adapter,
      rootDir: input.rootDir,
      filePath: downloaded?.filePath ?? input.file!,
      outPath: input.out,
      cachePath: input.cache,
      format,
      sourceLastModifiedAt: input.sourceLastModifiedAt ?? downloaded?.metadata.lastModifiedAt,
      fetchedAt: downloaded?.metadata.fetchedAt,
      sourceUrl: downloaded?.metadata.sourceUrl,
      remoteSnapshot: downloaded?.metadata,
      strict: input.strict,
      resumable: input.resumable || Boolean(input.resumeFromRunId),
      checkpointInterval: input.checkpointInterval,
      resumeFromRunId: input.resumeFromRunId,
    });
    const destinations = [result.outputPath, result.cachePath].filter(Boolean).join(" and ");
    console.log(input.json ? JSON.stringify(result, null, 2) : `Wrote ${result.stats.normalizedRecordCount} canonical records to ${destinations}.`);
  } finally {
    await downloaded?.cleanup();
  }
}
