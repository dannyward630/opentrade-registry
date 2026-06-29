import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractSingleTabularArchive } from "@opentrade-registry/registry";
import { SINGLE_CSV_ZIP } from "./helpers/zip-fixture.js";

describe("source archive extraction", () => {
  it("extracts one bounded CSV and cleans up its temporary directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-archive-test-"));
    const archivePath = join(directory, "source.zip");
    await writeFile(archivePath, SINGLE_CSV_ZIP);
    try {
      const extracted = await extractSingleTabularArchive(archivePath);
      expect(extracted.filePath.endsWith(".csv")).toBe(true);
      expect(await readFile(extracted.filePath, "utf8")).toContain("MN123,Example");
      await extracted.cleanup();
      await expect(readFile(extracted.filePath)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects archives beyond the compressed byte limit", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-archive-test-"));
    const archivePath = join(directory, "source.zip");
    await writeFile(archivePath, SINGLE_CSV_ZIP);
    try {
      await expect(extractSingleTabularArchive(archivePath, { maxCompressedBytes: 10 })).rejects.toThrow(/compressed byte limit/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
