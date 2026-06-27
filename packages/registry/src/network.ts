import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { RemoteSnapshotMetadata } from "@opentrade/core";

export type DownloadOptions = {
  allowedHosts: string[];
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  signal?: AbortSignal;
  fetchImplementation?: typeof fetch;
};

export type DownloadedSource = {
  filePath: string;
  metadata: RemoteSnapshotMetadata;
  cleanup(): Promise<void>;
};

export async function downloadOfficialSource(sourceUrl: string, options: DownloadOptions): Promise<DownloadedSource> {
  const initialUrl = validateUrl(sourceUrl, options.allowedHosts);
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(new Error(`Download timed out after ${options.timeoutMs ?? 30_000} ms.`)), options.timeoutMs ?? 30_000);
  const signal = anySignal([timeoutController.signal, options.signal]);
  const fetcher = options.fetchImplementation ?? fetch;
  const directory = await mkdtemp(join(tmpdir(), "opentrade-source-"));
  try {
    let currentUrl = initialUrl;
    let response: Response | undefined;
    for (let redirects = 0; redirects <= (options.maxRedirects ?? 5); redirects += 1) {
      response = await fetcher(currentUrl, { redirect: "manual", signal });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) throw new Error("Source unavailable: redirect response did not include a location.");
      if (redirects === (options.maxRedirects ?? 5)) throw new Error("Source unavailable: redirect limit exceeded.");
      currentUrl = validateUrl(new URL(location, currentUrl).toString(), options.allowedHosts);
    }
    if (!response?.ok) throw new Error(`Source unavailable: HTTP ${response?.status ?? "unknown"}.`);
    if (!response.body) throw new Error("Source unavailable: response body is empty.");

    const declaredLength = parseLength(response.headers.get("content-length"));
    const maxBytes = options.maxBytes ?? 100 * 1024 * 1024;
    if (declaredLength !== null && declaredLength > maxBytes) throw new Error(`Source unavailable: declared content length ${declaredLength} exceeds ${maxBytes} bytes.`);
    const contentType = response.headers.get("content-type");
    const suffix = inferSuffix(currentUrl, contentType);
    const filePath = join(directory, `source${suffix}`);
    const hash = createHash("sha256");
    let actualLength = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        actualLength += chunk.length;
        if (actualLength > maxBytes) return callback(new Error(`Source unavailable: download exceeded ${maxBytes} bytes.`));
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body as never), meter, createWriteStream(filePath), { signal });
    return {
      filePath,
      metadata: {
        fetchedAt: new Date().toISOString(),
        originalSourceUrl: initialUrl,
        sourceUrl: currentUrl,
        lastModifiedAt: normalizeHttpDate(response.headers.get("last-modified")),
        etag: response.headers.get("etag"),
        contentLength: actualLength,
        contentType,
        sha256: hash.digest("hex"),
      },
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function validateUrl(value: string, allowedHosts: string[]): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname))) throw new Error("Source unavailable: only HTTPS source URLs are allowed.");
  const hosts = allowedHosts.map((host) => host.toLowerCase());
  if (!hosts.includes(url.hostname.toLowerCase())) throw new Error(`Source unavailable: host ${url.hostname} is not allowed.`);
  if (url.username || url.password) throw new Error("Source unavailable: source URLs cannot contain credentials.");
  return url.toString();
}

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeHttpDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function inferSuffix(url: string, contentType: string | null): string {
  const extension = extname(new URL(url).pathname).toLowerCase();
  if ([".csv", ".xlsx", ".json"].includes(extension)) return extension;
  if (contentType?.includes("spreadsheetml")) return ".xlsx";
  if (contentType?.includes("json")) return ".json";
  return ".csv";
}

function isLoopback(hostname: string): boolean { return ["127.0.0.1", "::1", "localhost"].includes(hostname.toLowerCase()); }

function anySignal(signals: Array<AbortSignal | undefined>): AbortSignal {
  const active = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (active.length === 0) return new AbortController().signal;
  if (active.length === 1) return active[0]!;
  if (typeof AbortSignal.any === "function") return AbortSignal.any(active);
  const controller = new AbortController();
  for (const signal of active) signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  return controller.signal;
}
