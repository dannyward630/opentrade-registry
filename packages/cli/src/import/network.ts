import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RemoteSnapshotMetadata } from "@opentrade/core";

export type DownloadedSourceFile = {
  filePath: string;
  metadata: RemoteSnapshotMetadata;
  cleanup(): Promise<void>;
};

export type DownloadSourceOptions = {
  timeoutMs?: number;
  maxBytes?: number;
};

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;

export async function downloadSourceToTempFile(sourceUrl: string, options: DownloadSourceOptions = {}): Promise<DownloadedSourceFile> {
  const fetchedAt = new Date().toISOString();
  const timeoutMs = options.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(sourceUrl, { signal: controller.signal });

    if (!response.ok) {
      throw Object.assign(new Error(`Source unavailable: ${sourceUrl} returned HTTP ${response.status}.`), { exitCode: 3 });
    }

    const contentLengthHeader = response.headers.get("content-length");
    const declaredContentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    if (declaredContentLength !== null && Number.isFinite(declaredContentLength) && declaredContentLength > maxBytes) {
      throw Object.assign(new Error(`Source unavailable: ${sourceUrl} is larger than the ${maxBytes} byte download limit.`), { exitCode: 3 });
    }

    const text = await readResponseText(response, maxBytes, sourceUrl);
    const directory = await mkdtemp(join(tmpdir(), "opentrade-source-"));
    const filePath = join(directory, "source.csv");
    await writeFile(filePath, text, "utf8");

    return {
      filePath,
      metadata: {
        fetchedAt,
        sourceUrl,
        lastModifiedAt: parseHttpDate(response.headers.get("last-modified")),
        etag: response.headers.get("etag"),
        contentLength: declaredContentLength ?? Buffer.byteLength(text),
      },
      async cleanup() {
        await rm(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw Object.assign(new Error(`Source unavailable: ${sourceUrl} timed out after ${timeoutMs}ms.`), { exitCode: 3 });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseText(response: Response, maxBytes: number, sourceUrl: string): Promise<string> {
  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error(`Source unavailable: ${sourceUrl} exceeded the ${maxBytes} byte download limit.`), { exitCode: 3 });
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
}

function parseHttpDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
