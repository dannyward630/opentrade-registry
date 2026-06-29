import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { nationwideBoardInventorySchema } from "@opentrade-registry/core";

describe("nationwide board inventory", () => {
  it("tracks every registered source exactly once without claiming municipal coverage", async () => {
    const inventory = nationwideBoardInventorySchema.parse(JSON.parse(
      await readFile(join(process.cwd(), "registry", "board-inventory.json"), "utf8"),
    ));
    const sourceIds = await readSourceIds(join(process.cwd(), "registry", "sources"));
    const linkedSourceIds = inventory.boards.flatMap((board) => board.sourceIds);

    expect(inventory.scope.municipalLicensing).toBe("excluded");
    expect(inventory.completeness).toBe("representative_source_baseline");
    expect(inventory.boards).toHaveLength(sourceIds.length);
    expect(new Set(inventory.boards.map((board) => board.id)).size).toBe(inventory.boards.length);
    expect([...linkedSourceIds].sort()).toEqual(sourceIds);
  });
});

async function readSourceIds(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const ids: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) ids.push(...await readSourceIds(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) {
      ids.push((JSON.parse(await readFile(path, "utf8")) as { id: string }).id);
    }
  }
  return ids.sort();
}
