import { mkdtemp, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  assertStorageAdmission,
  classifyStoragePressure,
  inspectStoragePressure,
  runStoragePressureMonitor,
  writeStoragePressureStatus,
} from "../services/ingestion-worker/src/storage-pressure.js";

const checkedAt = "2026-07-13T10:00:00.000Z";

describe("storage pressure monitor", () => {
  it("classifies the warning and critical boundaries without rounding", () => {
    expect(classifyStoragePressure(15, 15, 10)).toBe("healthy");
    expect(classifyStoragePressure(14.999, 15, 10)).toBe("warning");
    expect(classifyStoragePressure(10, 15, 10)).toBe("warning");
    expect(classifyStoragePressure(9.999, 15, 10)).toBe("critical");
  });

  it("measures available capacity using filesystem blocks", async () => {
    const status = await inspectStoragePressure({
      path: "/snapshots",
      warningFreePercent: 15,
      stopFreePercent: 10,
      now: () => checkedAt,
      inspectFileSystem: async () => ({ blockSize: 1_024n, blocks: 100n, availableBlocks: 12n }),
    });
    expect(status).toEqual({
      schemaVersion: "1.0",
      path: "/snapshots",
      status: "warning",
      totalBytes: "102400",
      availableBytes: "12288",
      freePercent: 12,
      warningFreePercent: 15,
      stopFreePercent: 10,
      checkedAt,
    });
  });

  it("publishes atomically and admits a fresh warning state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-storage-pressure-"));
    const filePath = join(directory, "state", "storage-health.json");
    const status = await inspectStoragePressure({
      path: "/snapshots",
      warningFreePercent: 15,
      stopFreePercent: 10,
      now: () => checkedAt,
      inspectFileSystem: async () => ({ blockSize: 1n, blocks: 100n, availableBlocks: 12n }),
    });
    await writeStoragePressureStatus(filePath, status);

    await expect(assertStorageAdmission({
      filePath,
      maxAgeMs: 60_000,
      warningFreePercent: 15,
      stopFreePercent: 10,
      now: () => Date.parse(checkedAt) + 30_000,
    })).resolves.toMatchObject({ status: "warning", freePercent: 12 });
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual(status);
    expect((await stat(filePath)).mode & 0o777).toBe(0o644);
  });

  it("fails closed for critical, stale, future, threshold-mismatched, and malformed state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-storage-admission-"));
    const filePath = join(directory, "storage-health.json");
    const base = {
      schemaVersion: "1.0",
      path: "/snapshots",
      status: "critical",
      totalBytes: "100",
      availableBytes: "9",
      freePercent: 9,
      warningFreePercent: 15,
      stopFreePercent: 10,
      checkedAt,
    } as const;
    await writeFile(filePath, JSON.stringify(base));
    const admission = (overrides: Record<string, unknown> = {}) => assertStorageAdmission({
      filePath,
      maxAgeMs: 60_000,
      warningFreePercent: 15,
      stopFreePercent: 10,
      now: () => Date.parse(checkedAt) + 30_000,
      ...overrides,
    });
    await expect(admission()).rejects.toThrow("ingestion stop threshold");

    await writeFile(filePath, JSON.stringify({ ...base, status: "warning", freePercent: 12, availableBytes: "12" }));
    await expect(admission({ now: () => Date.parse(checkedAt) + 60_001 })).rejects.toThrow("stale");
    await expect(admission({ now: () => Date.parse(checkedAt) - 5_001 })).rejects.toThrow("future");
    await expect(admission({ warningFreePercent: 20 })).rejects.toThrow("thresholds");
    await writeFile(filePath, "not-json");
    await expect(admission()).rejects.toThrow("valid JSON");
  });

  it("rejects symbolic-link status files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-storage-symlink-"));
    const target = join(directory, "target.json");
    const link = join(directory, "storage-health.json");
    await writeFile(target, "{}");
    await symlink(target, link);
    await expect(assertStorageAdmission({
      filePath: link,
      maxAgeMs: 60_000,
      warningFreePercent: 15,
      stopFreePercent: 10,
    })).rejects.toThrow("regular file");
  });

  it("continues after a failed measurement and stops on cancellation", async () => {
    const controller = new AbortController();
    const onError = vi.fn();
    const onStatus = vi.fn(() => controller.abort());
    const inspect = vi.fn()
      .mockRejectedValueOnce(new Error("filesystem unavailable"))
      .mockResolvedValueOnce({
        schemaVersion: "1.0",
        path: "/snapshots",
        status: "healthy",
        totalBytes: "100",
        availableBytes: "50",
        freePercent: 50,
        warningFreePercent: 15,
        stopFreePercent: 10,
        checkedAt,
      });
    const write = vi.fn(async () => undefined);
    await runStoragePressureMonitor({
      path: "/snapshots",
      statusFilePath: "/state/storage-health.json",
      warningFreePercent: 15,
      stopFreePercent: 10,
      intervalMs: 1,
      signal: controller.signal,
      inspect,
      write,
      wait: async () => undefined,
      onError,
      onStatus,
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "filesystem unavailable" }));
    expect(write).toHaveBeenCalledOnce();
    expect(onStatus).toHaveBeenCalledOnce();
  });
});
