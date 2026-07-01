import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BOARD_TRADE_DOMAINS, boardTradeCoverageLedgerSchema, expandBoardTradeCoverageLedger } from "@opentrade-registry/core";

const root = process.cwd();
const outputPath = resolve(root, "docs/board-coverage-matrix.md");
const check = process.argv.includes("--check");
const ledger = boardTradeCoverageLedgerSchema.parse(JSON.parse(await readFile(resolve(root, "registry/board-coverage.json"), "utf8")));
const decisions = expandBoardTradeCoverageLedger(ledger);
const needsResearch = decisions.filter((decision) => decision.outcome === "needs_research").length;
const lines = [
  "# Board Coverage Matrix",
  "",
  "This generated matrix tracks the statewide trade-domain research required before OpenTrade Registry can claim complete board coverage. Municipal licensing remains excluded.",
  "",
  `Current status: **${needsResearch} trade-domain decisions still need research**. \`board_complete\` is blocked until this count reaches zero and every terminal decision has official evidence.`,
  "",
  `Required domains (${BOARD_TRADE_DOMAINS.length}): ${BOARD_TRADE_DOMAINS.map((domain) => `\`${domain}\``).join(", ")}.`,
  "",
  "| Jurisdiction | Resolved | Needs research | Status |",
  "| --- | ---: | ---: | --- |",
];

for (const jurisdiction of ledger.jurisdictions.toSorted((left, right) => left.state.localeCompare(right.state))) {
  const entries = decisions.filter((decision) => decision.state === jurisdiction.state);
  const unresolved = entries.filter((decision) => decision.outcome === "needs_research").length;
  lines.push(`| ${jurisdiction.state} | ${entries.length - unresolved} | ${unresolved} | ${unresolved === 0 ? "resolved" : "research in progress"} |`);
}

lines.push("", "Regenerate with `corepack pnpm board:coverage:matrix`. CI checks this file with `corepack pnpm board:coverage:matrix:check`.", "");
const output = lines.join("\n");
if (check) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("docs/board-coverage-matrix.md is stale. Run corepack pnpm board:coverage:matrix.");
    process.exitCode = 1;
  }
} else {
  await writeFile(outputPath, output, "utf8");
  console.log("Wrote docs/board-coverage-matrix.md.");
}
