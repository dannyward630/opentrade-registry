import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { isBoardInventoryComplete, nationwideBoardInventorySchema, summarizeBoardInventory } from "@opentrade-registry/core";

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
    expect(inventory.boards.filter((board) => board.inventoryStatus === "source_baseline")).toHaveLength(sourceIds.length - 22);
    expect(inventory.boards.filter((board) => board.inventoryStatus === "board_verified")).toHaveLength(22);
    expect(inventory.boards.filter((board) => board.identity.type === "source_endpoint")).toHaveLength(sourceIds.length - 22);
    expect(inventory.boards.filter((board) => board.identity.type === "regulatory_board")).toHaveLength(9);
    expect(inventory.boards.filter((board) => board.identity.type === "agency_program")).toHaveLength(13);
    expect(isBoardInventoryComplete(inventory)).toBe(false);
  });

  it("does not permit source-baseline rows in an independently board-complete inventory", () => {
    const entry = {
      id: "us.fl.example",
      jurisdiction: { country: "US" as const, state: "FL" },
      boardName: "Example Board",
      agencyName: "Example Agency",
      inventoryStatus: "source_baseline" as const,
      identity: { type: "source_endpoint" as const, canonicalName: "Example endpoint" },
      officialUrl: "https://example.gov/licenses",
      sourceIds: ["us.fl.example"],
      trades: ["general_contracting"],
      accessPath: "manual_handoff" as const,
      coverageLimitations: ["Fixture only."],
      evidence: {
        url: "https://example.gov",
        reviewedAt: "2026-07-10T00:00:00.000Z",
        note: "Fixture evidence.",
      },
    };
    expect(nationwideBoardInventorySchema.safeParse({
      schemaVersion: "2.0",
      completeness: "board_complete",
      scope: {
        jurisdictions: "states_dc_major_territories",
        municipalLicensing: "excluded",
        notes: ["Fixture scope."],
      },
      boards: [entry],
    }).success).toBe(false);

    const verified = {
      ...entry,
      inventoryStatus: "board_verified" as const,
      identity: { type: "regulatory_board" as const, canonicalName: "Example Board" },
    };
    const inventory = nationwideBoardInventorySchema.parse({
      schemaVersion: "2.0",
      completeness: "board_complete",
      scope: {
        jurisdictions: "states_dc_major_territories",
        municipalLicensing: "excluded",
        notes: ["Fixture scope."],
      },
      boards: [verified],
    });
    expect(summarizeBoardInventory(inventory)).toMatchObject({
      boardCount: 1,
      statusCounts: { board_verified: 1 },
      identityTypeCounts: { regulatory_board: 1 },
    });
    expect(isBoardInventoryComplete(inventory)).toBe(true);
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
