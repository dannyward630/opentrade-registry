import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const sourcesRoot = join(root, "registry", "sources");
const coveragePath = join(root, "registry", "us-coverage.json");
const options = new Set(process.argv.slice(2));

const sources = await loadSources(sourcesRoot);
const coverage = JSON.parse(await readFile(coveragePath, "utf8"));

const report = {
  sourceCount: sources.length,
  stateCount: coverage.states.length,
  researchedStateCount: coverage.states.filter((state) => state.sourceIds.length > 0).length,
  coverageByStatus: countBy(coverage.states, (state) => state.status),
  sourcesByType: countBy(sources, (source) => source.sourceType),
  sourcesByMaturity: countBy(sources, (source) => source.adapterMaturity),
  bulkCandidates: sources
    .filter((source) => source.hasBulkDownload === true || source.sourceType.startsWith("bulk_") || source.sourceType === "api")
    .map(toSourceSummary),
  lookupOnlySources: sources
    .filter((source) => source.sourceType === "html_lookup" || source.sourceType === "playwright_portal")
    .map(toSourceSummary),
};

if (options.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHumanReport(report);
}

async function loadSources(directory) {
  const files = await listJsonFiles(directory);
  const entries = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

async function listJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}

function countBy(values, getKey) {
  return values.reduce((counts, value) => {
    const key = getKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function toSourceSummary(source) {
  return {
    id: source.id,
    state: source.jurisdiction.state,
    sourceType: source.sourceType,
    adapterMaturity: source.adapterMaturity,
    adapterStatus: source.adapterStatus,
    hasBulkDownload: source.hasBulkDownload,
  };
}

function printHumanReport(report) {
  console.log("OpenTrade Registry source quality report");
  console.log(`sources: ${report.sourceCount}`);
  console.log(`states tracked: ${report.stateCount}`);
  console.log(`states with researched source entries: ${report.researchedStateCount}`);
  printCounts("coverage by status", report.coverageByStatus);
  printCounts("sources by type", report.sourcesByType);
  printCounts("sources by adapter maturity", report.sourcesByMaturity);
  printSourceList("bulk candidates", report.bulkCandidates);
  printSourceList("lookup-only sources", report.lookupOnlySources);
}

function printCounts(title, counts) {
  console.log(`\n${title}:`);
  for (const [key, value] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`- ${key}: ${value}`);
  }
}

function printSourceList(title, sources) {
  console.log(`\n${title}:`);
  if (sources.length === 0) {
    console.log("- none");
    return;
  }

  for (const source of sources) {
    console.log(`- ${source.id} (${source.sourceType}, ${source.adapterMaturity})`);
  }
}
