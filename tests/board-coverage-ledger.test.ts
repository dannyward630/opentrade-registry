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
    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toHaveLength(742);
    expect(expanded.filter((decision) => decision.outcome === "covered_by_board")).toHaveLength(41);
    expect(expanded.filter((decision) => decision.outcome === "not_state_regulated")).toHaveLength(1);
  });

  it("records Arizona ROC coverage and the documented asbestos training boundary", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "AZ");
    const asbestos = expanded.find((decision) => decision.tradeDomain === "asbestos");
    const rocDomains = expanded.filter((decision) => decision.tradeDomain !== "asbestos");

    expect(rocDomains).toHaveLength(13);
    expect(rocDomains.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(rocDomains.every((decision) => decision.boardIds.includes("us.az.roc.contractors"))).toBe(true);
    expect(asbestos?.outcome).toBe("not_state_regulated");
    expect(asbestos?.boardIds).toEqual([]);
    expect(asbestos?.evidence[0]?.url).toBe("https://azdeq.gov/asbestos");
  });

  it("records complete Florida coverage against separate DBPR board sources", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "FL");
    const electrical = expanded.find((decision) => decision.tradeDomain === "electrical");
    const asbestos = expanded.find((decision) => decision.tradeDomain === "asbestos");
    const constructionDomains = expanded.filter((decision) => !["electrical", "asbestos"].includes(decision.tradeDomain));

    expect(constructionDomains).toHaveLength(12);
    expect(constructionDomains.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(constructionDomains.every((decision) => decision.boardIds.includes("us.fl.dbpr.construction"))).toBe(true);
    expect(electrical).toMatchObject({ outcome: "covered_by_board", boardIds: ["us.fl.dbpr.electrical_contractors"] });
    expect(asbestos).toMatchObject({ outcome: "covered_by_board", boardIds: ["us.fl.dbpr.asbestos_contractors"] });
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
