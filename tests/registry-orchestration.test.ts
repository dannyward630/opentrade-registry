import { createServer } from "node:http";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { floridaDbprConstructionAdapter } from "@opentrade/adapter-fl-dbpr";
import { OpenTradeRegistry } from "@opentrade/registry";
import { OpenTradeSqliteCache } from "@opentrade/storage-sqlite";

const fixture = join(process.cwd(), "packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv");

describe("OpenTrade registry orchestration", () => {
  it("syncs a local file into a cache and verifies from both inputs", async () => {
    const cache = await OpenTradeSqliteCache.open();
    const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
    const sync = await registry.sync({ sourceId: floridaDbprConstructionAdapter.sourceId, input: { mode: "file", filePath: fixture }, cache, collectRecords: true });
    expect(sync.status).toBe("completed");
    expect(sync.stats.normalizedRecordCount).toBe(5);
    expect(sync.records).toHaveLength(5);

    expect((await registry.verify({ sourceId: floridaDbprConstructionAdapter.sourceId, licenseNumber: "CGC012345", input: { mode: "file", filePath: fixture } })).result).toBe("matched");
    expect((await registry.verify({ sourceId: floridaDbprConstructionAdapter.sourceId, licenseNumber: "CGC012345", input: { mode: "cache" }, cache })).result).toBe("matched");
    await cache.close();
  });

  it("returns structured unsupported and invalid results", async () => {
    const registry = new OpenTradeRegistry([]);
    const unsupported = await registry.sync({ sourceId: "us.test.unsupported", input: { mode: "file", filePath: fixture } });
    expect(unsupported.status).toBe("unsupported");
    expect(unsupported.errors[0].code).toBe("adapter_not_available");
    expect((await registry.verify({ sourceId: "us.test.unsupported", licenseNumber: "ABC", input: { mode: "file", filePath: fixture } })).result).toBe("source_unavailable");

    const supported = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
    expect((await supported.verify({ sourceId: floridaDbprConstructionAdapter.sourceId, licenseNumber: "!!!", input: { mode: "file", filePath: fixture } })).result).toBe("missing_required_input");
  });

  it("requires explicit network opt-in and supports cancellation-safe local HTTP tests", async () => {
    const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
    const denied = await registry.verify({ sourceId: floridaDbprConstructionAdapter.sourceId, licenseNumber: "CGC012345", input: { mode: "network", url: "https://www2.myfloridalicense.com/test.csv", allowNetwork: false } });
    expect(denied.result).toBe("source_unavailable");
    expect(denied.reasons[0].message).toContain("allowNetwork");

    const csv = await import("node:fs/promises").then(({ readFile }) => readFile(fixture));
    const server = createServer((_request, response) => { response.setHeader("content-type", "text/csv"); response.end(csv); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing server address");
      const result = await registry.verify({ sourceId: floridaDbprConstructionAdapter.sourceId, licenseNumber: "CGC012345", input: { mode: "network", url: `http://127.0.0.1:${address.port}/fixture.csv`, allowNetwork: true } });
      expect(result.result).toBe("matched");
    } finally {
      server.close();
    }
  });

  it("stops a sync when its abort signal is cancelled", async () => {
    const controller = new AbortController();
    const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
    const result = await registry.sync({
      sourceId: floridaDbprConstructionAdapter.sourceId,
      input: { mode: "file", filePath: fixture },
      signal: controller.signal,
      onRecord() { controller.abort(new Error("cancelled by caller")); },
    });
    expect(result.status).toBe("failed");
    expect(result.stats.normalizedRecordCount).toBe(1);
    expect(result.errors.at(-1)?.message).toContain("cancelled by caller");
  });
});
