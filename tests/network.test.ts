import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { describe, expect, it } from "vitest";
import { downloadSourceToTempFile } from "../packages/cli/src/import/network.js";
import { SINGLE_CSV_ZIP } from "./helpers/zip-fixture.js";

describe("network source download helper", () => {
  it("downloads a local fixture response and cleans up the temp file", async () => {
    const server = await startServer((_request, response) => {
      response.setHeader("content-type", "text/csv");
      response.setHeader("last-modified", "Thu, 01 Jan 2026 00:00:00 GMT");
      response.setHeader("etag", "\"fixture\"");
      response.end("license,status\nWA001,ACTIVE\n");
    });

    try {
      const downloaded = await downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 1024, allowedHosts: ["127.0.0.1"] });
      expect(existsSync(downloaded.filePath)).toBe(true);
      expect(downloaded.metadata.sourceUrl).toBe(server.url);
      expect(downloaded.metadata.lastModifiedAt).toBe("2026-01-01T00:00:00.000Z");
      expect(downloaded.metadata.etag).toBe("\"fixture\"");
      expect(downloaded.metadata.contentType).toBe("text/csv");
      expect(downloaded.metadata.sha256).toMatch(/^[a-f0-9]{64}$/);

      await downloaded.cleanup();
      expect(existsSync(downloaded.filePath)).toBe(false);
    } finally {
      await server.close();
    }
  });

  it("preserves binary XLSX bytes and chooses an XLSX temp suffix", async () => {
    const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff]);
    const server = await startServer((_request, response) => {
      response.setHeader("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      response.end(bytes);
    }, "/licenses.xlsx");

    try {
      const downloaded = await downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 1024, allowedHosts: ["127.0.0.1"] });
      expect(downloaded.filePath.endsWith(".xlsx")).toBe(true);
      expect(readFileSync(downloaded.filePath)).toEqual(bytes);
      await downloaded.cleanup();
    } finally {
      await server.close();
    }
  });

  it("downloads and safely extracts a single-file ZIP source", async () => {
    const server = await startServer((_request, response) => {
      response.setHeader("content-type", "application/zip");
      response.end(SINGLE_CSV_ZIP);
    }, "/licenses.zip");

    try {
      const downloaded = await downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 1024, allowedHosts: ["127.0.0.1"] });
      expect(downloaded.filePath.endsWith(".csv")).toBe(true);
      expect(readFileSync(downloaded.filePath, "utf8")).toContain("MN123,Example");
      expect(downloaded.metadata.contentType).toBe("application/zip");
      await downloaded.cleanup();
      expect(existsSync(downloaded.filePath)).toBe(false);
    } finally {
      await server.close();
    }
  });

  it("rejects redirects to a host outside the allowlist", async () => {
    const server = await startServer((_request, response) => {
      response.statusCode = 302;
      response.setHeader("location", "https://example.com/licenses.csv");
      response.end();
    });

    try {
      await expect(
        downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 1024, allowedHosts: ["127.0.0.1"] }),
      ).rejects.toThrow(/host .* not allowed/i);
    } finally {
      await server.close();
    }
  });

  it("rejects responses larger than the configured byte limit", async () => {
    const server = await startServer((_request, response) => {
      response.setHeader("content-length", "2048");
      response.end("too large");
    });

    try {
      await expect(downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 10, allowedHosts: ["127.0.0.1"] })).rejects.toThrow(/exceeds 10 bytes/i);
    } finally {
      await server.close();
    }
  });

  it("times out slow local responses", async () => {
    const server = await startServer((_request, response) => {
      setTimeout(() => {
        response.end("late");
      }, 100);
    });

    try {
      await expect(downloadSourceToTempFile(server.url, { timeoutMs: 10, maxBytes: 1024, allowedHosts: ["127.0.0.1"] })).rejects.toThrow(/timed out/i);
    } finally {
      await server.close();
    }
  });

  it("cancels an in-progress download", async () => {
    const server = await startServer((_request, response) => {
      setTimeout(() => response.end("late"), 250);
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("cancelled by test")), 10);
    try {
      await expect(downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 1024, signal: controller.signal, allowedHosts: ["127.0.0.1"] })).rejects.toThrow(/cancelled by test|aborted/i);
    } finally {
      await server.close();
    }
  });
});

async function startServer(
  handler: Parameters<typeof createServer>[0],
  path = "/source.csv",
): Promise<{ url: string; close(): Promise<void> }> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start fixture server.");
  }

  return {
    url: `http://127.0.0.1:${address.port}${path}`,
    close: () => closeServer(server),
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
