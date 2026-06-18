import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceRegistryEntrySchema } from "@opentrade/core";

describe("source registry", () => {
  it("validates every source registry entry", async () => {
    const files = await listJsonFiles(join(process.cwd(), "registry", "sources"));
    expect(files.length).toBeGreaterThanOrEqual(2);

    const parsed = [];
    for (const file of files) {
      parsed.push(sourceRegistryEntrySchema.parse(JSON.parse(await readFile(file, "utf8"))));
    }

    expect(parsed.map((entry) => entry.id).sort()).toEqual(["us.ca.cslb.contractors", "us.fl.dbpr.construction"]);
    expect(parsed.every((entry) => entry.redistributionStatus === "unknown")).toBe(true);
  });
});

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}

