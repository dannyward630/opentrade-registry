import { extname } from "node:path";
import {
  downloadOfficialSource,
  extractSingleTabularArchive,
  resolveOfficialSnapshotUrl,
  type DownloadOptions,
  type DownloadedSource,
} from "@opentrade-registry/registry";
import type { SourceRegistryEntry } from "@opentrade-registry/core";

export type DownloadedSourceFile = DownloadedSource;
export type DownloadSourceOptions = Omit<DownloadOptions, "allowedHosts"> & { allowedHosts: string[] };

export async function downloadSourceToTempFile(sourceUrl: string, options: DownloadSourceOptions): Promise<DownloadedSourceFile> {
  try {
    const downloaded = await downloadOfficialSource(sourceUrl, options);
    if (extname(downloaded.filePath).toLowerCase() !== ".zip") return downloaded;
    try {
      const extracted = await extractSingleTabularArchive(downloaded.filePath);
      return {
        filePath: extracted.filePath,
        metadata: downloaded.metadata,
        cleanup: async () => {
          await extracted.cleanup();
          await downloaded.cleanup();
        },
      };
    } catch (error) {
      await downloaded.cleanup();
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) Object.assign(error, { exitCode: 3 });
    throw error;
  }
}

export async function resolveNetworkSourceUrl(
  metadata: SourceRegistryEntry,
  explicitUrl?: string,
): Promise<string> {
  if (explicitUrl) return explicitUrl;
  return (await resolveOfficialSnapshotUrl(metadata)).url;
}

export function buildAllowedSourceHosts(
  metadata: Pick<SourceRegistryEntry, "id" | "sourceUrl" | "officialLookupUrl" | "documentationUrl" | "agency">,
  requestedUrl: string,
): string[] {
  const requestedHost = new URL(requestedUrl).hostname.toLowerCase();
  if (["127.0.0.1", "::1", "localhost"].includes(requestedHost)) return [requestedHost];

  const declaredUrls = [metadata.sourceUrl, metadata.officialLookupUrl, metadata.documentationUrl, metadata.agency.url]
    .filter((value): value is string => Boolean(value));
  const allowedHosts = [...new Set(declaredUrls.map((value) => new URL(value).hostname.toLowerCase()))];
  if (!allowedHosts.includes(requestedHost)) {
    throw Object.assign(new Error(`Source unavailable: host ${requestedHost} is not declared for ${metadata.id}.`), { exitCode: 3 });
  }
  return allowedHosts;
}
