import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const sourcesRoot = join(root, "registry", "sources");
const coveragePath = join(root, "registry", "us-coverage.json");
const territoryCoveragePath = join(root, "registry", "us-territory-coverage.json");
const options = new Set(process.argv.slice(2));

const sources = await loadSources(sourcesRoot);
const coverage = JSON.parse(await readFile(coveragePath, "utf8"));
const territoryCoverage = JSON.parse(await readFile(territoryCoveragePath, "utf8"));
const REQUIRED_METADATA_FIELDS = [
  "documentationUrl",
  "updateFrequency",
  "knownExclusions",
  "rateLimitNotes",
  "publicRecordsNotes",
  "officialBulkDownloadNotes",
  "researchNotes",
  "maintainerNotes",
];
const SOURCE_RESEARCH_OUTCOMES = [
  "production_ready",
  "network_opt_in",
  "local_file_adapter",
  "blocked",
  "deprecated",
];
const missingRequiredMetadataByField = Object.fromEntries(
  REQUIRED_METADATA_FIELDS.map((field) => [field, sources.filter((source) => isEmptyMetadataValue(source[field])).map(toSourceSummary)]),
);

const report = {
  sourceCount: sources.length,
  terminalSourceCount: sources.filter((source) => SOURCE_RESEARCH_OUTCOMES.includes(source.sourceResearchOutcome)).length,
  blockedSourceCount: sources.filter((source) => source.sourceResearchOutcome === "blocked").length,
  allSources: sources.map(toSourceSummary),
  stateCount: coverage.states.length,
  researchedStateCount: coverage.states.filter((state) => state.sourceIds.length > 0).length,
  territoryCount: territoryCoverage.territories.length,
  researchedTerritoryCount: territoryCoverage.territories.filter((territory) => territory.sourceIds.length > 0).length,
  coverageByStatus: countBy(coverage.states, (state) => state.status),
  territoryCoverageByStatus: countBy(territoryCoverage.territories, (territory) => territory.status),
  sourcesByType: countBy(sources, (source) => source.sourceType),
  sourcesByMaturity: countBy(sources, (source) => source.adapterMaturity),
  sourcesByAdapterQualityLevel: countBy(sources, (source) => String(source.adapterQualityLevel ?? 0)),
  sourcesByResearchOutcome: Object.fromEntries(
    SOURCE_RESEARCH_OUTCOMES.map((outcome) => [outcome, sources.filter((source) => getSourceResearchOutcome(source) === outcome).length]),
  ),
  metadataCompleteness: {
    requiredFields: REQUIRED_METADATA_FIELDS,
    missingRequiredMetadataByField,
    missingRequiredMetadataSources: [
      ...new Map(
        Object.values(missingRequiredMetadataByField)
          .flat()
          .map((source) => [source.id, source]),
      ).values(),
    ].sort((a, b) => a.id.localeCompare(b.id)),
    termsUrlMissingSources: sources.filter((source) => isEmptyMetadataValue(source.termsUrl)).map(toSourceSummary),
    termsUrlUnreviewedSources: sources
      .filter((source) => isEmptyMetadataValue(source.termsUrl) && isEmptyMetadataValue(source.termsReviewNotes))
      .map(toSourceSummary),
    officialLookupUrlMissingSources: sources.filter((source) => isEmptyMetadataValue(source.officialLookupUrl)).map(toSourceSummary),
    officialLookupUrlUnreviewedSources: sources
      .filter((source) => isEmptyMetadataValue(source.officialLookupUrl) && isEmptyMetadataValue(source.officialLookupReviewNotes))
      .map(toSourceSummary),
    implementedVerificationCaveatsMissingSources: sources
      .filter((source) => source.adapterStatus === "implemented" && isEmptyMetadataValue(source.verificationCaveats))
      .map(toSourceSummary),
    sourcesMissingResearchOutcome: sources
      .filter((source) => !SOURCE_RESEARCH_OUTCOMES.includes(getSourceResearchOutcome(source)))
      .map(toSourceSummary),
    sourcesMissingNextAction: sources
      .filter((source) => isEmptyMetadataValue(getSourceResearchNextAction(source)))
      .map(toSourceSummary),
  },
  implementedSourcesNeedingLevel4: sources
    .filter((source) => source.adapterStatus === "implemented" && source.adapterQualityLevel !== 4)
    .map(toSourceSummary),
  territorySources: sources
    .filter((source) => isTerritoryCode(source.jurisdiction.state))
    .map(toSourceSummary),
  manualPublicRecordsSources: sources
    .filter((source) => source.sourceType === "manual_public_records_file")
    .map(toSourceSummary),
  implementedAdapterSources: sources
    .filter((source) => source.adapterStatus === "implemented")
    .map(toSourceSummary),
  bulkCandidates: sources
    .filter(isBulkShapedCandidate)
    .map(toSourceSummary),
  unimplementedBulkAdapterCandidates: sources
    .filter(isUnimplementedBulkAdapterCandidate)
    .map(toSourceSummary),
  downloadResearchCandidates: sources
    .filter(isDownloadResearchCandidate)
    .map(toSourceSummary),
  lookupAutomationConstraintSources: sources
    .filter(hasLookupAutomationConstraint)
    .map(toSourceSummary),
  lookupOnlySources: sources
    .filter((source) => source.sourceType === "html_lookup" || source.sourceType === "playwright_portal")
    .map(toSourceSummary),
};

if (options.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else if (options.has("--markdown") || options.has("--write-markdown") || options.has("--check-markdown")) {
  const markdown = buildMarkdownReport(report);
  const outputPath = join(root, "docs", "source-status-matrix.md");
  if (options.has("--write-markdown")) {
    await writeFile(outputPath, markdown, "utf8");
    console.log(`Wrote ${outputPath}`);
  } else if (options.has("--check-markdown")) {
    const existing = await readFile(outputPath, "utf8");
    if (existing !== markdown) {
      console.error(`${outputPath} is out of date. Run corepack pnpm source:matrix.`);
      process.exitCode = 1;
    }
  } else {
    process.stdout.write(markdown);
  }
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
    adapterQualityLevel: source.adapterQualityLevel ?? 0,
    adapterStatus: source.adapterStatus,
    hasBulkDownload: source.hasBulkDownload,
    sourceResearchOutcome: getSourceResearchOutcome(source),
    nextAction: getSourceResearchNextAction(source),
  };
}

function isBulkShapedCandidate(source) {
  return source.hasBulkDownload === true || source.sourceType.startsWith("bulk_") || source.sourceType === "api";
}

function isUnimplementedBulkAdapterCandidate(source) {
  return false;
}

function isDownloadResearchCandidate(source) {
  return false;
}

function hasLookupAutomationConstraint(source) {
  return source.sourceResearchOutcome === "blocked" && source.blocker?.code === "access_controls";
}

function getSourceResearchOutcome(source) {
  return source.sourceResearchOutcome ?? "missing";
}

function getSourceResearchNextAction(source) {
  switch (getSourceResearchOutcome(source)) {
    case "production_ready":
      return "Maintain the production adapter, source canary, caveats, and scheduled evidence review.";
    case "network_opt_in":
      return "Maintain explicit network consent, remote provenance, offline tests, and scheduled evidence review.";
    case "local_file_adapter":
      return "Maintain official local-file compatibility, fixtures, caveats, and scheduled evidence review.";
    case "blocked":
    case "deprecated":
      return source.blocker?.summary ?? "Review the documented source decision on schedule.";
    default:
      return "";
  }
}

function isEmptyMetadataValue(value) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function printHumanReport(report) {
  console.log("OpenTrade Registry source quality report");
  console.log(`sources: ${report.sourceCount}`);
  console.log(`states tracked: ${report.stateCount}`);
  console.log(`states with researched source entries: ${report.researchedStateCount}`);
  console.log(`territories tracked: ${report.territoryCount}`);
  console.log(`territories with researched source entries: ${report.researchedTerritoryCount}`);
  printCounts("coverage by status", report.coverageByStatus);
  printCounts("territory coverage by status", report.territoryCoverageByStatus);
  printCounts("sources by type", report.sourcesByType);
  printCounts("sources by adapter maturity", report.sourcesByMaturity);
  printCounts("sources by adapter quality level", report.sourcesByAdapterQualityLevel);
  printCounts("sources by research outcome", report.sourcesByResearchOutcome);
  printMetadataCompleteness(report.metadataCompleteness);
  printSourceList("implemented sources needing Level 4 review", report.implementedSourcesNeedingLevel4);
  printSourceList("implemented adapter sources", report.implementedAdapterSources);
  printSourceList("territory sources", report.territorySources);
  printSourceList("manual public-records-file sources", report.manualPublicRecordsSources);
  printSourceList("bulk candidates", report.bulkCandidates);
  printSourceList("unimplemented bulk adapter candidates", report.unimplementedBulkAdapterCandidates);
  printSourceList("download/export research candidates", report.downloadResearchCandidates);
  printSourceList("lookup automation constraint sources", report.lookupAutomationConstraintSources);
  printSourceList("lookup-only sources", report.lookupOnlySources);
}

function printMetadataCompleteness(metadataCompleteness) {
  console.log("\nmetadata completeness:");
  console.log(`- required fields checked: ${metadataCompleteness.requiredFields.join(", ")}`);
  printSourceList("sources missing required metadata", metadataCompleteness.missingRequiredMetadataSources);
  printSourceList("sources missing terms URL", metadataCompleteness.termsUrlMissingSources);
  printSourceList("sources with undocumented missing terms URL", metadataCompleteness.termsUrlUnreviewedSources);
  printSourceList("sources missing official lookup URL", metadataCompleteness.officialLookupUrlMissingSources);
  printSourceList("sources with undocumented missing official lookup URL", metadataCompleteness.officialLookupUrlUnreviewedSources);
  printSourceList("implemented sources missing verification caveats", metadataCompleteness.implementedVerificationCaveatsMissingSources);
  printSourceList("sources missing research outcome", metadataCompleteness.sourcesMissingResearchOutcome);
  printSourceList("sources missing next action", metadataCompleteness.sourcesMissingNextAction);
}

function isTerritoryCode(value) {
  return ["AS", "GU", "MP", "PR", "VI"].includes(value);
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

function buildMarkdownReport(report) {
  const lines = [
    "# OpenTrade Registry Source Status Matrix",
    "",
    "Generated from the source registry by `corepack pnpm source:matrix`. Do not edit this file by hand.",
    "",
    `Tracked sources: ${report.sourceCount}. Implemented adapters: ${report.implementedAdapterSources.length}. Terminal blocked sources: ${report.blockedSourceCount}.`,
    "",
    "| Source ID | Jurisdiction | Maturity | Quality | Research outcome | Next action |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const source of report.allSources) {
    lines.push(
      `| \`${source.id}\` | ${escapeMarkdown(source.state)} | \`${source.adapterMaturity}\` | ${source.adapterQualityLevel} | \`${source.sourceResearchOutcome}\` | ${escapeMarkdown(source.nextAction)} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}
