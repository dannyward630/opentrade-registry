import { createHash } from "node:crypto";
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
  allowedHosts?: string[];
  maxRedirects?: number;
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
    const { response, finalUrl } = await fetchWithRedirects(sourceUrl, controller.signal, options.allowedHosts, options.maxRedirects ?? 3);

    if (!response.ok) {
      throw Object.assign(new Error(`Source unavailable: ${sourceUrl} returned HTTP ${response.status}.`), { exitCode: 3 });
    }

    const contentLengthHeader = response.headers.get("content-length");
    const declaredContentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    if (declaredContentLength !== null && Number.isFinite(declaredContentLength) && declaredContentLength > maxBytes) {
      throw Object.assign(new Error(`Source unavailable: ${sourceUrl} is larger than the ${maxBytes} byte download limit.`), { exitCode: 3 });
    }

    const bytes = await readResponseBytes(response, maxBytes, sourceUrl);
    const directory = await mkdtemp(join(tmpdir(), "opentrade-source-"));
    const contentType = normalizeContentType(response.headers.get("content-type"));
    const filePath = join(directory, `source${inferFileExtension(finalUrl, contentType)}`);
    await writeFile(filePath, bytes);

    return {
      filePath,
      metadata: {
        fetchedAt,
        sourceUrl: finalUrl,
        originalSourceUrl: finalUrl === sourceUrl ? null : sourceUrl,
        lastModifiedAt: parseHttpDate(response.headers.get("last-modified")),
        etag: response.headers.get("etag"),
        contentLength: bytes.byteLength,
        contentType,
        sha256: createHash("sha256").update(bytes).digest("hex"),
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

async function readResponseBytes(response: Response, maxBytes: number, sourceUrl: string): Promise<Buffer> {
  if (!response.body) {
    return Buffer.from(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  let totalBytes = 0;
  const chunks: Uint8Array[] = [];

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

    chunks.push(value);
  }

  return Buffer.concat(chunks, totalBytes);
}

async function fetchWithRedirects(
  sourceUrl: string,
  signal: AbortSignal,
  allowedHosts: string[] | undefined,
  maxRedirects: number,
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = sourceUrl;
  validateHost(currentUrl, allowedHosts, "source");

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetch(currentUrl, { signal, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: currentUrl };
    }

    const location = response.headers.get("location");
    if (!location) {
      throw Object.assign(new Error(`Source unavailable: ${currentUrl} returned a redirect without a location.`), { exitCode: 3 });
    }
    if (redirectCount === maxRedirects) {
      throw Object.assign(new Error(`Source unavailable: ${sourceUrl} exceeded the ${maxRedirects} redirect limit.`), { exitCode: 3 });
    }

    currentUrl = new URL(location, currentUrl).toString();
    validateHost(currentUrl, allowedHosts, "redirect");
  }

  throw new Error("Unreachable redirect state.");
}

function validateHost(url: string, allowedHosts: string[] | undefined, kind: "source" | "redirect"): void {
  if (!allowedHosts || allowedHosts.length === 0) {
    return;
  }
  const hostname = new URL(url).hostname.toLowerCase();
  if (!allowedHosts.map((host) => host.toLowerCase()).includes(hostname)) {
    throw Object.assign(new Error(`Source unavailable: ${kind} host ${hostname} is not in the allowed host list.`), { exitCode: 3 });
  }
}

function normalizeContentType(value: string | null): string | null {
  return value?.split(";", 1)[0]?.trim().toLowerCase() || null;
}

function inferFileExtension(sourceUrl: string, contentType: string | null): string {
  const pathname = new URL(sourceUrl).pathname.toLowerCase();
  if (pathname.endsWith(".xlsx") || contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return ".xlsx";
  }
  if (pathname.endsWith(".json") || contentType === "application/json") {
    return ".json";
  }
  return ".csv";
}

function parseHttpDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
