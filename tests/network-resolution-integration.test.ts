import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { floridaDbprConstructionAdapter } from "@opentrade-registry/adapter-fl-dbpr";
import { OpenTradeRegistry } from "@opentrade-registry/registry";

describe("programmatic network snapshot resolution", () => {
  it("syncs a registered source without a caller-supplied URL", async () => {
    const fixture = await readFile(join(process.cwd(), "packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv"));
    const fetchImplementation = vi.fn(async () => new Response(fixture, {
      status: 200,
      headers: { "content-type": "text/csv", etag: '"fixture"' },
    })) as unknown as typeof fetch;
    const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);

    const result = await registry.sync({
      sourceId: floridaDbprConstructionAdapter.sourceId,
      input: {
        mode: "network",
        allowNetwork: true,
        download: { fetchImplementation, maxBytes: 1024 * 1024 },
      },
      collectRecords: true,
    });

    expect(result.status).toBe("completed");
    expect(result.records).toHaveLength(5);
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://www2.myfloridalicense.com/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv",
      expect.objectContaining({ redirect: "manual" }),
    );
  });
});
