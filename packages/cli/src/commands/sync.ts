import { requireAdapter } from "../adapters.js";
import { parseSyncFormat } from "../import/export.js";
import { downloadSourceToTempFile } from "../import/network.js";
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

  if (!input.out && !input.cache) {
    throw Object.assign(new Error("Sync requires at least one destination: --out or --cache."), { exitCode: 2 });
  }

  const format = parseSyncFormat(input.format);
  const metadata = await adapter.getSourceMetadata();
  const downloaded = input.url
    ? await downloadSourceToTempFile(input.url, { allowedHosts: buildAllowedSourceHosts(metadata, input.url) })
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
    });
    const destinations = [result.outputPath, result.cachePath].filter(Boolean).join(" and ");
    console.log(input.json ? JSON.stringify(result, null, 2) : `Wrote ${result.stats.normalizedRecordCount} canonical records to ${destinations}.`);
  } finally {
    await downloaded?.cleanup();
  }
}

function buildAllowedSourceHosts(metadata: Awaited<ReturnType<ReturnType<typeof requireAdapter>["getSourceMetadata"]>>, requestedUrl: string): string[] {
  const requestedHost = new URL(requestedUrl).hostname.toLowerCase();
  if (["127.0.0.1", "::1", "localhost"].includes(requestedHost)) {
    return [requestedHost];
  }

  const declaredUrls = [metadata.sourceUrl, metadata.officialLookupUrl, metadata.documentationUrl, metadata.agency.url]
    .filter((value): value is string => Boolean(value));
  const allowedHosts = [...new Set(declaredUrls.map((value) => new URL(value).hostname.toLowerCase()))];
  if (!allowedHosts.includes(requestedHost)) {
    throw Object.assign(new Error(`Source unavailable: host ${requestedHost} is not declared for ${metadata.id}.`), { exitCode: 3 });
  }
  return allowedHosts;
}
