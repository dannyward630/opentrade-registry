import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  BOARD_TRADE_DOMAINS,
  boardTradeCoverageLedgerSchema,
  expandBoardTradeCoverageLedger,
  nationwideBoardInventorySchema,
} from "@opentrade-registry/core";

const root = process.cwd();
const jsonOutput = process.argv.includes("--json");
const requireComplete = process.argv.includes("--require-complete");
const [ledger, inventory, stateCoverage, territoryCoverage] = await Promise.all([
  json("registry/board-coverage.json").then((value) => boardTradeCoverageLedgerSchema.parse(value)),
  json("registry/board-inventory.json").then((value) => nationwideBoardInventorySchema.parse(value)),
  json("registry/us-coverage.json"),
  json("registry/us-territory-coverage.json"),
]);

const expectedJurisdictions = [
  ...stateCoverage.states.map((entry) => entry.state),
  ...territoryCoverage.territories.map((entry) => entry.territory),
].sort();
const actualJurisdictions = ledger.jurisdictions.map((entry) => entry.state).sort();
if (JSON.stringify(actualJurisdictions) !== JSON.stringify(expectedJurisdictions)) {
  throw new Error("Board coverage jurisdictions must exactly match state and territory coverage indexes.");
}

const boardIds = new Set(inventory.boards.map((board) => board.id));
const decisions = expandBoardTradeCoverageLedger(ledger);
for (const decision of decisions) {
  for (const boardId of decision.boardIds) {
    if (!boardIds.has(boardId)) throw new Error(`Unknown board ID ${boardId} in ${decision.state}/${decision.tradeDomain}.`);
  }
}

const needsResearchCount = decisions.filter((decision) => decision.outcome === "needs_research").length;
const report = {
  completeness: ledger.completeness,
  jurisdictionCount: ledger.jurisdictions.length,
  tradeDomainCount: BOARD_TRADE_DOMAINS.length,
  decisionCount: decisions.length,
  resolvedCount: decisions.length - needsResearchCount,
  needsResearchCount,
};

if (jsonOutput) console.log(JSON.stringify(report, null, 2));
else {
  console.log("OpenTrade Registry board coverage");
  for (const [name, value] of Object.entries(report)) console.log(`${name}: ${value}`);
}

if (requireComplete && (ledger.completeness !== "board_complete" || needsResearchCount > 0)) {
  console.error(`${needsResearchCount} trade-domain decisions still need research; board_complete cannot be released.`);
  process.exitCode = 1;
}

async function json(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
