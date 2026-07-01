import { z } from "zod";

export const boardAccessPathSchema = z.enum([
  "production_adapter",
  "network_opt_in",
  "local_file",
  "browser_lookup",
  "manual_handoff",
  "blocked",
  "deprecated",
]);

export const BOARD_TRADE_DOMAINS = [
  "general_contracting",
  "residential_contracting",
  "commercial_contracting",
  "electrical",
  "plumbing",
  "hvac",
  "mechanical",
  "roofing",
  "solar",
  "pool_spa",
  "asbestos",
  "sheet_metal",
  "underground_utility",
  "home_improvement",
] as const;

export const boardTradeDomainSchema = z.enum(BOARD_TRADE_DOMAINS);
export const boardTradeCoverageOutcomeSchema = z.enum([
  "covered_by_board",
  "not_state_regulated",
  "local_only",
  "needs_research",
]);

export const boardTradeCoverageEvidenceSchema = z.object({
  url: z.string().url(),
  reviewedAt: z.string().datetime(),
  note: z.string().min(1),
});

export const boardTradeCoverageDecisionSchema = z.object({
  outcome: boardTradeCoverageOutcomeSchema,
  boardIds: z.array(z.string().min(1)).default([]),
  evidence: z.array(boardTradeCoverageEvidenceSchema).default([]),
  limitations: z.array(z.string().min(1)).default([]),
}).superRefine((decision, context) => {
  if (decision.outcome === "needs_research") {
    if (decision.boardIds.length > 0 || decision.evidence.length > 0) {
      context.addIssue({ code: "custom", message: "Research gaps cannot claim board IDs or evidence." });
    }
    return;
  }
  if (decision.evidence.length === 0) {
    context.addIssue({ code: "custom", path: ["evidence"], message: "Terminal trade coverage decisions require official evidence." });
  }
  if (decision.outcome === "covered_by_board" && decision.boardIds.length === 0) {
    context.addIssue({ code: "custom", path: ["boardIds"], message: "Covered trade domains require at least one board ID." });
  }
  if (decision.outcome !== "covered_by_board" && decision.boardIds.length > 0) {
    context.addIssue({ code: "custom", path: ["boardIds"], message: "Only covered trade domains may reference board IDs." });
  }
});

export const boardTradeCoverageLedgerSchema = z.object({
  schemaVersion: z.literal("2.0"),
  completeness: z.enum(["research_in_progress", "board_complete"]),
  defaultDecision: boardTradeCoverageDecisionSchema.optional(),
  jurisdictions: z.array(z.object({
    state: z.string().length(2),
    decisions: z.partialRecord(boardTradeDomainSchema, boardTradeCoverageDecisionSchema),
  })).min(1),
}).superRefine((ledger, context) => {
  if (new Set(ledger.jurisdictions.map((entry) => entry.state)).size !== ledger.jurisdictions.length) {
    context.addIssue({ code: "custom", path: ["jurisdictions"], message: "Jurisdictions must be unique." });
  }
  if (ledger.completeness === "research_in_progress") {
    if (ledger.defaultDecision?.outcome !== "needs_research") {
      context.addIssue({ code: "custom", path: ["defaultDecision"], message: "Research-in-progress ledgers require a needs_research default." });
    }
    return;
  }
  if (ledger.defaultDecision) {
    context.addIssue({ code: "custom", path: ["defaultDecision"], message: "Board-complete ledgers cannot use a default decision." });
  }
  for (const [index, jurisdiction] of ledger.jurisdictions.entries()) {
    for (const domain of BOARD_TRADE_DOMAINS) {
      const decision = jurisdiction.decisions[domain];
      if (!decision || decision.outcome === "needs_research") {
        context.addIssue({ code: "custom", path: ["jurisdictions", index, "decisions", domain], message: "Board-complete ledgers require an explicit terminal decision for every trade domain." });
      }
    }
  }
});

export const boardInventoryEntrySchema = z.object({
  id: z.string().min(1),
  jurisdiction: z.object({
    country: z.literal("US"),
    state: z.string().length(2),
  }),
  boardName: z.string().min(1),
  agencyName: z.string().min(1),
  officialUrl: z.string().url(),
  sourceIds: z.array(z.string().min(1)).min(1),
  trades: z.array(z.string().min(1)).min(1),
  accessPath: boardAccessPathSchema,
  coverageLimitations: z.array(z.string().min(1)).min(1),
  evidence: z.object({
    url: z.string().url(),
    reviewedAt: z.string().datetime(),
    note: z.string().min(1),
  }),
});

export const nationwideBoardInventorySchema = z.object({
  schemaVersion: z.literal("2.0"),
  completeness: z.enum(["representative_source_baseline", "board_complete"]),
  scope: z.object({
    jurisdictions: z.enum(["states_dc_major_territories"]),
    municipalLicensing: z.literal("excluded"),
    notes: z.array(z.string().min(1)).min(1),
  }),
  boards: z.array(boardInventoryEntrySchema).min(1),
});

export type BoardAccessPath = z.infer<typeof boardAccessPathSchema>;
export type BoardInventoryEntry = z.infer<typeof boardInventoryEntrySchema>;
export type NationwideBoardInventory = z.infer<typeof nationwideBoardInventorySchema>;
export type BoardTradeDomain = z.infer<typeof boardTradeDomainSchema>;
export type BoardTradeCoverageDecision = z.infer<typeof boardTradeCoverageDecisionSchema>;
export type BoardTradeCoverageLedger = z.infer<typeof boardTradeCoverageLedgerSchema>;

export function expandBoardTradeCoverageLedger(ledger: BoardTradeCoverageLedger) {
  return ledger.jurisdictions.flatMap((jurisdiction) => BOARD_TRADE_DOMAINS.map((tradeDomain) => ({
    state: jurisdiction.state,
    tradeDomain,
    ...(jurisdiction.decisions[tradeDomain] ?? ledger.defaultDecision!),
  })));
}
