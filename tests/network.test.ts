import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { describe, expect, it } from "vitest";
import { downloadSourceToTempFile } from "../packages/cli/src/import/network.js";

describe("network source download helper", () => {
  it("downloads a local fixture response and cleans up the temp file", async () => {
    const server = await startServer((_request, response) => {
      response.setHeader("content-type", "text/csv");
      response.setHeader("last-modified", "Thu, 01 Jan 2026 00:00:00 GMT");
      response.setHeader("etag", "\"fixture\"");
      response.end("license,status\nWA001,ACTIVE\n");
    });

    try {
      const downloaded = await downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 1024 });
      expect(existsSync(downloaded.filePath)).toBe(true);
      expect(downloaded.metadata.sourceUrl).toBe(server.url);
      expect(downloaded.metadata.lastModifiedAt).toBe("2026-01-01T00:00:00.000Z");
      expect(downloaded.metadata.etag).toBe("\"fixture\"");

      await downloaded.cleanup();
      expect(existsSync(downloaded.filePath)).toBe(false);
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
      await expect(downloadSourceToTempFile(server.url, { timeoutMs: 1_000, maxBytes: 10 })).rejects.toThrow(/download limit/i);
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
      await expect(downloadSourceToTempFile(server.url, { timeoutMs: 10, maxBytes: 1024 })).rejects.toThrow(/timed out/i);
    } finally {
      await server.close();
    }
  });
});

async function startServer(
  handler: Parameters<typeof createServer>[0],
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
    url: `http://127.0.0.1:${address.port}/source.csv`,
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
