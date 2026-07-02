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
    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toHaveLength(507);
    expect(expanded.filter((decision) => decision.outcome === "covered_by_board")).toHaveLength(255);
    expect(expanded.filter((decision) => decision.outcome === "not_state_regulated")).toHaveLength(6);
    expect(expanded.filter((decision) => decision.outcome === "local_only")).toHaveLength(16);
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

  it("records complete Alaska contractor and administrator coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "AK");
    const unresolved = expanded.filter((decision) => decision.outcome === "needs_research");

    expect(unresolved).toEqual([]);
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.ak.commerce.construction_contractors", "us.ak.commerce.electrical_administrators"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "hvac")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.ak.commerce.construction_contractors", "us.ak.commerce.mechanical_administrators"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "general_contracting")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.ak.commerce.construction_contractors"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "underground_utility")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.ak.commerce.construction_contractors"],
    });
    for (const domain of ["pool_spa", "solar"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)).toMatchObject({
        outcome: "covered_by_board",
        boardIds: ["us.ak.commerce.construction_contractors", "us.ak.commerce.mechanical_administrators"],
      });
    }
  });

  it("records complete Alabama board-specific trade coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "AL");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.find((decision) => decision.tradeDomain === "residential_contracting")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.al.hblb.home_builders"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.al.aecb.electrical_contractors", "us.al.genconbd.general_contractors"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "plumbing")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.al.pgfb.plumbers_gas_fitters", "us.al.genconbd.general_contractors"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "hvac")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.al.hacr.contractors", "us.al.genconbd.general_contractors"],
    });
    for (const domain of ["general_contracting", "commercial_contracting", "pool_spa", "asbestos", "underground_utility"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)?.boardIds).toContain("us.al.genconbd.general_contractors");
    }
  });

  it("records complete Arkansas contractor classification coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "AR");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(expanded.every((decision) => decision.boardIds.includes("us.ar.aclb.contractors"))).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")?.limitations.join(" ")).toContain("master electrician");
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.limitations.join(" ")).toContain("trade certificate");
    expect(expanded.find((decision) => decision.tradeDomain === "home_improvement")?.limitations.join(" ")).toContain("structural remodeling");
  });

  it("records complete South Carolina board-specific trade coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "SC");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "residential_contracting")?.boardIds).toEqual(["us.sc.llr.residential_builders"]);
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.boardIds).toEqual(["us.sc.des.asbestos"]);
    expect(expanded.find((decision) => decision.tradeDomain === "pool_spa")?.boardIds).toEqual(["us.sc.llr.contractors"]);
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.limitations.join(" ")).toContain("multiple classifications");
  });

  it("records complete Louisiana contractor classification coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "LA");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(expanded.every((decision) => decision.boardIds.includes("us.la.lslbc.contractors"))).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "plumbing")?.limitations.join(" ")).toContain("master plumber");
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.limitations.join(" ")).toContain("Environmental Quality");
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.limitations.join(" ")).toContain("underlying");
  });

  it("records complete Mississippi contractor classification coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "MS");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(expanded.every((decision) => decision.boardIds.includes("us.ms.msboc.contractors"))).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.limitations.join(" ")).toContain("electrical or mechanical");
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.limitations.join(" ")).toContain("Environmental Quality");
    expect(expanded.find((decision) => decision.tradeDomain === "pool_spa")?.limitations.join(" ")).toContain("excludes");
  });

  it("records complete Tennessee contractor classification coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "TN");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(expanded.every((decision) => decision.boardIds.includes("us.tn.commerce.contractors"))).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")?.evidence[0]?.note).toContain("CE");
    expect(expanded.find((decision) => decision.tradeDomain === "mechanical")?.evidence[0]?.note).toContain("CMC");
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.limitations.join(" ")).toContain("TDEC");
    expect(expanded.find((decision) => decision.tradeDomain === "home_improvement")?.limitations.join(" ")).toContain("county-specific");
  });

  it("records complete Nevada contractor classification coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "NV");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(expanded.every((decision) => decision.boardIds.includes("us.nv.nscb.contractors"))).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "general_contracting")?.evidence[0]?.note).toContain("Class A");
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")?.evidence[0]?.note).toContain("C-2");
    expect(expanded.find((decision) => decision.tradeDomain === "hvac")?.evidence[0]?.note).toContain("C-21");
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.limitations.join(" ")).toContain("companion classifications");
  });

  it("records complete Utah DOPL contractor classification coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "UT");
    const unresolved = expanded.filter((decision) => decision.outcome === "needs_research");

    expect(unresolved).toEqual([]);
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.ut.dopl.contractors"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "hvac")?.evidence[0]?.note).toContain("H100");
    expect(expanded.find((decision) => decision.tradeDomain === "sheet_metal")?.evidence[0]?.note).toContain("S340");
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")).toMatchObject({
      outcome: "not_state_regulated",
      boardIds: [],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.limitations.join(" ")).toContain("DEQ");
  });

  it("records complete New Mexico CID coverage across tracked trade domains", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "NM");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toHaveLength(0);
    expect(expanded.every((decision) => decision.boardIds.includes("us.nm.rld.construction_industries"))).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "roofing")?.evidence[0]?.note).toContain("GS-21");
    expect(expanded.find((decision) => decision.tradeDomain === "sheet_metal")?.evidence[0]?.note).toContain("GS-32");
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.evidence[0]?.note).toContain("asbestos materials");
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.limitations.join(" ")).toContain("photovoltaic");
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

  it("records Texas statewide trade coverage and official local-only boundaries", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "TX");
    const unresolved = expanded.filter((decision) => decision.outcome === "needs_research");

    expect(unresolved.map((decision) => decision.tradeDomain).sort()).toEqual([
      "pool_spa",
      "sheet_metal",
      "underground_utility",
    ]);
    for (const domain of ["general_contracting", "residential_contracting", "commercial_contracting", "roofing", "home_improvement"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)).toMatchObject({
        outcome: "local_only",
        boardIds: [],
      });
    }
    for (const domain of ["electrical", "hvac", "mechanical", "solar"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)).toMatchObject({
        outcome: "covered_by_board",
        boardIds: ["us.tx.tdlr.all_licenses"],
      });
    }
    expect(expanded.find((decision) => decision.tradeDomain === "plumbing")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.tx.tsbpe.plumbing"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.tx.dshs.asbestos"],
    });
  });

  it("records complete Hawaii contractor classification coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "HI");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.every((decision) => decision.outcome === "covered_by_board")).toBe(true);
    expect(expanded.every((decision) => decision.boardIds.includes("us.hi.dcca.contractors"))).toBe(true);
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")?.evidence[0]?.note).toContain("C-13");
    expect(expanded.find((decision) => decision.tradeDomain === "pool_spa")?.evidence[0]?.note).toContain("C-49");
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.evidence[0]?.note).toContain("C-60");
    expect(expanded.find((decision) => decision.tradeDomain === "sheet_metal")?.evidence[0]?.note).toContain("C-44");
    expect(expanded.find((decision) => decision.tradeDomain === "home_improvement")?.limitations.join(" ")).toContain("not a separate");
  });

  it("records complete Georgia board and specialty-policy coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "GA");
    const unresolved = expanded.filter((decision) => decision.outcome === "needs_research");

    expect(unresolved).toEqual([]);
    for (const domain of ["general_contracting", "residential_contracting", "commercial_contracting", "home_improvement"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)?.boardIds).toEqual(["us.ga.sos.residential_general_contractors"]);
    }
    for (const domain of ["electrical", "plumbing", "hvac", "mechanical", "underground_utility"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)?.boardIds).toEqual(["us.ga.sos.construction_industry_trades"]);
    }
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.boardIds).toEqual(["us.ga.epd.asbestos_contractors"]);
    expect(expanded.find((decision) => decision.tradeDomain === "roofing")).toMatchObject({ outcome: "not_state_regulated", boardIds: [] });
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.boardIds).toEqual(["us.ga.sos.construction_industry_trades"]);
    for (const domain of ["pool_spa", "sheet_metal"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)).toMatchObject({ outcome: "not_state_regulated", boardIds: [] });
    }
  });

  it("records complete Connecticut contractor, occupational trade, and asbestos coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "CT");

    expect(expanded).toHaveLength(BOARD_TRADE_DOMAINS.length);
    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.find((decision) => decision.tradeDomain === "general_contracting")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.ct.dcp.major_contractors"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "home_improvement")?.boardIds).toEqual([
      "us.ct.dcp.home_improvement_contractors",
    ]);
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")?.boardIds).toEqual([
      "us.ct.dcp.occupational_trades",
    ]);
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.boardIds).toEqual([
      "us.ct.dph.asbestos_contractors",
    ]);
    expect(expanded.find((decision) => decision.tradeDomain === "underground_utility")?.limitations).toContain(
      "This decision covers regulated plumbing, piping, and well-drilling scopes, not every civil utility or excavation activity. Local permits and utility-owner requirements remain excluded.",
    );
  });

  it("records complete Delaware registration, professional trade, and asbestos coverage", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "DE");

    expect(expanded).toHaveLength(BOARD_TRADE_DOMAINS.length);
    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    for (const domain of ["general_contracting", "residential_contracting", "commercial_contracting", "roofing", "underground_utility", "home_improvement"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)?.boardIds).toEqual([
        "us.de.labor.construction_contractors",
      ]);
    }
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")?.boardIds).toEqual([
      "us.de.labor.construction_contractors",
      "us.de.dpr.electrical_examiners",
    ]);
    for (const domain of ["plumbing", "hvac", "mechanical", "pool_spa", "sheet_metal"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)?.boardIds).toEqual([
        "us.de.labor.construction_contractors",
        "us.de.dpr.plumbing_hvacr",
      ]);
    }
    expect(expanded.find((decision) => decision.tradeDomain === "solar")?.boardIds).toEqual([
      "us.de.labor.construction_contractors",
      "us.de.dpr.electrical_examiners",
      "us.de.dpr.plumbing_hvacr",
    ]);
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.boardIds).toEqual([
      "us.de.labor.construction_contractors",
      "us.de.dfm.asbestos_contractors",
    ]);
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")?.limitations.join(" ")).toContain("DFM asbestos credentials");
  });

  it("records North Carolina board coverage and sheet-metal boundary evidence", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "NC");
    const unresolved = expanded.filter((decision) => decision.outcome === "needs_research");

    expect(unresolved).toHaveLength(0);
    for (const domain of ["general_contracting", "residential_contracting", "commercial_contracting", "roofing", "pool_spa", "asbestos", "underground_utility", "home_improvement"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)).toMatchObject({
        outcome: "covered_by_board",
        boardIds: ["us.nc.nclbgc.general_contractors"],
      });
    }
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.nc.ncbeec.electrical_contractors"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "solar")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.nc.ncbeec.electrical_contractors", "us.nc.nclbgc.general_contractors"],
    });
    for (const domain of ["plumbing", "hvac"]) {
      expect(expanded.find((decision) => decision.tradeDomain === domain)).toMatchObject({
        outcome: "covered_by_board",
        boardIds: ["us.nc.nclicensing.plumbing_heating_fire_sprinkler"],
      });
    }
    expect(expanded.find((decision) => decision.tradeDomain === "mechanical")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.nc.nclicensing.plumbing_heating_fire_sprinkler", "us.nc.refrigerationboard.refrigeration_contractors"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "sheet_metal")).toMatchObject({
      outcome: "not_state_regulated",
      boardIds: [],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "sheet_metal")?.evidence[0]?.note).toContain("S(Metal Erection)");
  });

  it("records Colorado statewide trade boards and local-only construction boundaries", async () => {
    const ledger = boardTradeCoverageLedgerSchema.parse(await json("registry/board-coverage.json"));
    const expanded = expandBoardTradeCoverageLedger(ledger).filter((decision) => decision.state === "CO");

    expect(expanded.filter((decision) => decision.outcome === "needs_research")).toEqual([]);
    expect(expanded.find((decision) => decision.tradeDomain === "electrical")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.co.dora.trades"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "plumbing")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.co.dora.trades"],
    });
    expect(expanded.find((decision) => decision.tradeDomain === "asbestos")).toMatchObject({
      outcome: "covered_by_board",
      boardIds: ["us.co.cdphe.asbestos_contractors"],
    });

    for (const domain of [
      "general_contracting",
      "residential_contracting",
      "commercial_contracting",
      "roofing",
      "hvac",
      "mechanical",
      "solar",
      "pool_spa",
      "sheet_metal",
      "underground_utility",
      "home_improvement",
    ]) {
      const decision = expanded.find((entry) => entry.tradeDomain === domain);
      expect(decision?.outcome, `${domain} should be documented as local-only in Colorado`).toBe("local_only");
      expect(decision?.boardIds).toEqual([]);
      expect(decision?.evidence[0]?.url).toBe("https://dora.colorado.gov/consumer-protection-home-and-repair");
    }
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
