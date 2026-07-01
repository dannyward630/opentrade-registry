import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  BOARD_TRADE_DOMAINS,
  boardTradeCoverageLedgerSchema,
  expandBoardTradeCoverageLedger,
  nationwideBoardInventorySchema,
} from "@opentrade-registry/core";

describe("nationwide board trade coverage ledger", () => {
  it("tracks every jurisdiction and required trade domain without overstating completeness", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger);
    expect(ledger.completeness).toBe("research_in_progress");
    expect(ledger.jurisdictions).toHaveLength(56);
    expect(new Set(ledger.jurisdictions.map((entry) => entry.state)).size).toBe(56);
    expect(expanded).toHaveLength(56 * BOARD_TRADE_DOMAINS.length);
    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toHaveLength(770);
    expect(expanded.filter((decision) => decision.outcome === "covered_by_board")).toHaveLength(14);
  });

  it("requires board references and evidence for terminal coverage decisions", () => {
    const base = {
      schemaVersion: "2.0",
      completeness: "board_complete",
      jurisdictions: [{
        state: "FL",
        decisions: Object.fromEntries(BOARD_TRADE_DOMAINS.map((domain) => [domain, {
          outcome: "covered_by_board",
          boardIds: ["us.fl.dbpr.construction"],
          evidence: [{ url: "https://example.gov", reviewedAt: "2026-07-01T00:00:00.000Z", note: "Fixture evidence." }],
        }])),
      }],
    };
    expect(boardTradeCoverageLedgerSchema.safeParse(base).success).toBe(true);
    expect(boardTradeCoverageLedgerSchema.safeParse({
      ...base,
      jurisdictions: [{ state: "FL", decisions: { general_contracting: { outcome: "covered_by_board" } } }],
    }).success).toBe(false);
  });

  it("resolves every covered board ID to the board inventory", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const inventory = nationwideBoardInventorySchema.parse(await json("registry/board-inventory.json"));
    const boardIds = new Set(inventory.boards.map((board) => board.id));
    for (const decision of expandBoardTradeCoverageLedger(ledger)) {
      for (const boardId of decision.boardIds) expect(boardIds.has(boardId)).toBe(true);
    }
  });
});

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}
