import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isBoardInventoryComplete, nationwideBoardInventorySchema, summarizeBoardInventory } from "@opentrade-registry/core";

const root = process.cwd();
const jsonOutput = process.argv.includes("--json");
const requireComplete = process.argv.includes("--require-complete");
const inventory = nationwideBoardInventorySchema.parse(JSON.parse(
  await readFile(resolve(root, "registry/board-inventory.json"), "utf8"),
));
const report = summarizeBoardInventory(inventory);

if (jsonOutput) console.log(JSON.stringify(report, null, 2));
else {
  console.log("OpenTrade Registry board inventory");
  console.log(`completeness: ${report.completeness}`);
  console.log(`boardCount: ${report.boardCount}`);
  console.log(`linkedSourceCount: ${report.linkedSourceCount}`);
  for (const [name, count] of Object.entries(report.statusCounts)) console.log(`${name}: ${count}`);
  for (const [name, count] of Object.entries(report.identityTypeCounts)) console.log(`${name}: ${count}`);
}

if (requireComplete && !isBoardInventoryComplete(inventory)) {
  console.error("Board inventory is not independently board-complete. Source-baseline rows must be audited, consolidated, or intentionally deprecated.");
  process.exitCode = 1;
}
