import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RemoteSnapshotMetadata } from "@opentrade/core";

export type DownloadedSourceFile = {
  filePath: string;
  metadata: RemoteSnapshotMetadata;
  cleanup(): Promise<void>;
};

export async function downloadSourceToTempFile(sourceUrl: string): Promise<DownloadedSourceFile> {
  const fetchedAt = new Date().toISOString();
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw Object.assign(new Error(`Source unavailable: ${sourceUrl} returned HTTP ${response.status}.`), { exitCode: 3 });
  }

  const text = await response.text();
  const directory = await mkdtemp(join(tmpdir(), "opentrade-source-"));
  const filePath = join(directory, "source.csv");
  await writeFile(filePath, text, "utf8");

  const contentLength = response.headers.get("content-length");
  return {
    filePath,
    metadata: {
      fetchedAt,
      sourceUrl,
      lastModifiedAt: parseHttpDate(response.headers.get("last-modified")),
      etag: response.headers.get("etag"),
      contentLength: contentLength ? Number(contentLength) : text.length,
    },
    async cleanup() {
      await rm(directory, { recursive: true, force: true });
    },
  };
}

function parseHttpDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
