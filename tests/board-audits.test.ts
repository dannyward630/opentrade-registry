import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  boardInventoryAuditManifestSchema,
  nationwideBoardInventorySchema,
} from "@opentrade-registry/core";

describe("board inventory audits", () => {
  it("replaces only known source-baseline rows with independently audited board identities", async () => {
    const [manifest, inventory, sourceIds] = await Promise.all([
      json("registry/board-audits.json").then((value) => boardInventoryAuditManifestSchema.parse(value)),
      json("registry/board-inventory.json").then((value) => nationwideBoardInventorySchema.parse(value)),
      readSourceIds(join(process.cwd(), "registry", "sources")),
    ]);

    expect(manifest.audits).toHaveLength(1);
    for (const audit of manifest.audits) {
      expect(audit.identity.type).not.toBe("source_endpoint");
      expect(audit.inventoryStatus).toBe("board_verified");
      expect(audit.sourceIds.every((sourceId) => sourceIds.includes(sourceId))).toBe(true);
      expect(inventory.boards.find((board) => board.id === audit.id)).toEqual(audit);
    }
  });
});

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(process.cwd(), path), "utf8"));
}

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
