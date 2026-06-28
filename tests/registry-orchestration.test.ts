import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { floridaDbprConstructionAdapter } from "@opentrade-registry/adapter-fl-dbpr";
import { OpenTradeRegistry } from "@opentrade-registry/registry";
import { OpenTradeSqliteCache } from "@opentrade-registry/storage-sqlite";

const fixture = join(process.cwd(), "packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv");

describe("OpenTrade registry orchestration", () => {
  it("syncs a local file into a cache and verifies from both inputs", async () => {
    const cache = await OpenTradeSqliteCache.open();
    const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
    const sync = await registry.sync({ sourceId: floridaDbprConstructionAdapter.sourceId, input: { mode: "file", filePath: fixture }, cache, collectRecords: true });
    expect(sync.status).toBe("completed");
    expect(sync.stats.normalizedRecordCount).toBe(5);
    expect(sync.records).toHaveLength(5);
    expect(sync.importRun).toMatchObject({
      sourceId: floridaDbprConstructionAdapter.sourceId,
      status: "completed",
      lastProcessedRow: 5,
      rawRecordCount: 5,
      normalizedRecordCount: 5,
    });
    expect(sync.importRun?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(cache.getImportRun(sync.importRun?.id ?? "missing")).toEqual(sync.importRun);

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
    const cache = await OpenTradeSqliteCache.open();
    const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
    const result = await registry.sync({
      sourceId: floridaDbprConstructionAdapter.sourceId,
      input: { mode: "file", filePath: fixture },
      cache,
      signal: controller.signal,
      onRecord() { controller.abort(new Error("cancelled by caller")); },
    });
    expect(result.status).toBe("failed");
    expect(result.stats.normalizedRecordCount).toBe(1);
    expect(result.errors.at(-1)?.message).toContain("cancelled by caller");
    expect(cache.findByLicenseNumber(floridaDbprConstructionAdapter.sourceId, "CGC012345")).toEqual([]);
    await cache.close();
  });

  it("checkpoints and resumes an explicitly resumable cache import", async () => {
    const controller = new AbortController();
    const cache = await OpenTradeSqliteCache.open();
    const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);
    const interrupted = await registry.sync({
      sourceId: floridaDbprConstructionAdapter.sourceId,
      input: { mode: "file", filePath: fixture },
      cache,
      resumable: true,
      checkpointInterval: 1,
      onRecord() { controller.abort(new Error("intentional resumable interruption")); },
      signal: controller.signal,
    });

    expect(interrupted.status).toBe("failed");
    expect(interrupted.importRun).toMatchObject({ status: "interrupted", lastProcessedRow: 1, normalizedRecordCount: 1 });
    expect(cache.findByLicenseNumber(floridaDbprConstructionAdapter.sourceId, "CGC012345")).toHaveLength(1);

    const resumed = await registry.sync({
      sourceId: floridaDbprConstructionAdapter.sourceId,
      input: { mode: "file", filePath: fixture },
      cache,
      resumable: true,
      checkpointInterval: 1,
      resumeFromRunId: interrupted.importRun?.id,
    });
    expect(resumed.status).toBe("completed");
    expect(resumed.importRun).toMatchObject({ status: "completed", lastProcessedRow: 5, normalizedRecordCount: 5 });
    expect(cache.database.exec("select count(*) from opentrade_license_records")[0]?.values[0]?.[0]).toBe(5);
    await cache.close();
  });

  it("rolls back cache writes when strict normalization fails after valid rows", async () => {
    const cache = await OpenTradeSqliteCache.open();
    const failingAdapter = {
      ...floridaDbprConstructionAdapter,
      async normalize(raw: Parameters<typeof floridaDbprConstructionAdapter.normalize>[0]) {
        if (raw.rowNumber === 2) throw new Error("fixture normalization failure");
        return floridaDbprConstructionAdapter.normalize(raw);
      },
    };
    const registry = new OpenTradeRegistry([failingAdapter]);
    const result = await registry.sync({
      sourceId: floridaDbprConstructionAdapter.sourceId,
      input: { mode: "file", filePath: fixture },
      cache,
      strict: true,
    });
    expect(result.status).toBe("failed");
    expect(result.errors[0].message).toContain("fixture normalization failure");
    expect(cache.findByLicenseNumber(floridaDbprConstructionAdapter.sourceId, "CGC012345")).toEqual([]);
    await cache.close();
  });

  it("isolates malformed CSV rows unless strict mode is enabled", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-malformed-row-"));
    const filePath = join(directory, "malformed.csv");
    try {
      const rows = (await readFile(fixture, "utf8")).trim().split("\n");
      await writeFile(filePath, `${rows[0]}\n"unterminated\n${rows[1]}\n`, "utf8");
      const registry = new OpenTradeRegistry([floridaDbprConstructionAdapter]);

      const tolerant = await registry.sync({
        sourceId: floridaDbprConstructionAdapter.sourceId,
        input: { mode: "file", filePath },
        collectRecords: true,
      });
      expect(tolerant.status).toBe("completed");
      expect(tolerant.records).toHaveLength(2);
      expect(tolerant.errors).toContainEqual(expect.objectContaining({
        code: "row_parse_failed",
        rowNumber: 2,
      }));

      const strict = await registry.sync({
        sourceId: floridaDbprConstructionAdapter.sourceId,
        input: { mode: "file", filePath },
        strict: true,
      });
      expect(strict.status).toBe("failed");
      expect(strict.errors).toContainEqual(expect.objectContaining({ code: "row_parse_failed", rowNumber: 2 }));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("counts and skips exact duplicate source records", async () => {
    const duplicateAdapter = {
      ...floridaDbprConstructionAdapter,
      async *streamRawRecords(options: Parameters<typeof floridaDbprConstructionAdapter.streamRawRecords>[0]) {
        const first = await floridaDbprConstructionAdapter.streamRawRecords({ ...options, limit: 1 })[Symbol.asyncIterator]().next();
        if (first.done) throw new Error("Fixture did not provide a record.");
        yield first.value;
        yield { ...first.value, rowNumber: 2 };
      },
    };
    const result = await new OpenTradeRegistry([duplicateAdapter]).sync({
      sourceId: duplicateAdapter.sourceId,
      input: { mode: "file", filePath: fixture },
      collectRecords: true,
    });

    expect(result.status).toBe("completed");
    expect(result.stats.rawRecordCount).toBe(2);
    expect(result.stats.normalizedRecordCount).toBe(1);
    expect(result.stats.duplicateRecordCount).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "duplicate_source_record" }));
  });
});
