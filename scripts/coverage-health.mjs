import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const REQUIRED_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const REQUIRED_TERRITORY_CODES = ["AS", "GU", "MP", "PR", "VI"];
const options = new Set(process.argv.slice(2));
const root = process.cwd();

const sources = await loadSources(join(root, "registry", "sources"));
const coverage = JSON.parse(await readFile(join(root, "registry", "us-coverage.json"), "utf8"));
const territoryCoverage = JSON.parse(await readFile(join(root, "registry", "us-territory-coverage.json"), "utf8"));
const report = buildCoverageHealthReport(sources, coverage.states, territoryCoverage.territories);

if (options.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHumanReport(report);
}

if (!report.ok) {
  process.exitCode = 6;
}

function buildCoverageHealthReport(sources, states, territories) {
  const sourceIds = new Set(sources.map((source) => source.id));
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const stateCodes = states.map((entry) => entry.state);
  const territoryCodes = territories.map((entry) => entry.territory);
  const coverageSourceRefs = [
    ...states.flatMap((entry) => entry.sourceIds.map((sourceId) => ({ code: entry.state, sourceId, kind: "state" }))),
    ...territories.flatMap((entry) => entry.sourceIds.map((sourceId) => ({ code: entry.territory, sourceId, kind: "territory" }))),
  ];
  const coveredSourceIds = new Set(coverageSourceRefs.map((entry) => entry.sourceId));

  const missingStateCodes = REQUIRED_STATE_CODES.filter((code) => !stateCodes.includes(code));
  const extraStateCodes = stateCodes.filter((code) => !REQUIRED_STATE_CODES.includes(code));
  const duplicateStateCodes = duplicateValues(stateCodes);
  const missingTerritoryCodes = REQUIRED_TERRITORY_CODES.filter((code) => !territoryCodes.includes(code));
  const extraTerritoryCodes = territoryCodes.filter((code) => !REQUIRED_TERRITORY_CODES.includes(code));
  const duplicateTerritoryCodes = duplicateValues(territoryCodes);
  const stateEntriesWithoutSources = states.filter((entry) => entry.sourceIds.length === 0).map((entry) => entry.state);
  const territoryEntriesWithoutSources = territories.filter((entry) => entry.sourceIds.length === 0).map((entry) => entry.territory);
  const coverageSourceIdsMissingRegistry = coverageSourceRefs
    .filter((entry) => !sourceIds.has(entry.sourceId))
    .map((entry) => entry.sourceId)
    .sort();
  const sourcesMissingCoverage = sources
    .filter((source) => !coveredSourceIds.has(source.id))
    .map((source) => source.id)
    .sort();
  const mismatchedCoverageSources = coverageSourceRefs
    .filter((entry) => {
      const source = sourcesById.get(entry.sourceId);
      return source && source.jurisdiction?.state !== entry.code;
    })
    .map((entry) => ({
      sourceId: entry.sourceId,
      coverageCode: entry.code,
      sourceJurisdiction: sourcesById.get(entry.sourceId)?.jurisdiction?.state,
    }))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));

  const failures = [
    ...missingStateCodes.map((code) => `Missing state coverage row: ${code}`),
    ...extraStateCodes.map((code) => `Unexpected state coverage row: ${code}`),
    ...duplicateStateCodes.map((code) => `Duplicate state coverage row: ${code}`),
    ...missingTerritoryCodes.map((code) => `Missing territory coverage row: ${code}`),
    ...extraTerritoryCodes.map((code) => `Unexpected territory coverage row: ${code}`),
    ...duplicateTerritoryCodes.map((code) => `Duplicate territory coverage row: ${code}`),
    ...stateEntriesWithoutSources.map((code) => `State coverage row has no source IDs: ${code}`),
    ...territoryEntriesWithoutSources.map((code) => `Territory coverage row has no source IDs: ${code}`),
    ...coverageSourceIdsMissingRegistry.map((sourceId) => `Coverage references missing source: ${sourceId}`),
    ...sourcesMissingCoverage.map((sourceId) => `Source is missing from coverage index: ${sourceId}`),
    ...mismatchedCoverageSources.map(
      (entry) => `Coverage/source jurisdiction mismatch: ${entry.sourceId} coverage=${entry.coverageCode} source=${entry.sourceJurisdiction}`,
    ),
  ];

  return {
    ok: failures.length === 0,
    sourceCount: sources.length,
    requiredStateCount: REQUIRED_STATE_CODES.length,
    stateCoverageRowCount: states.length,
    researchedStateCount: states.filter((entry) => entry.sourceIds.length > 0).length,
    requiredTerritoryCount: REQUIRED_TERRITORY_CODES.length,
    territoryCoverageRowCount: territories.length,
    researchedTerritoryCount: territories.filter((entry) => entry.sourceIds.length > 0).length,
    missingStateCodes,
    extraStateCodes,
    duplicateStateCodes,
    missingTerritoryCodes,
    extraTerritoryCodes,
    duplicateTerritoryCodes,
    stateEntriesWithoutSources,
    territoryEntriesWithoutSources,
    coverageSourceIdsMissingRegistry,
    sourcesMissingCoverage,
    mismatchedCoverageSources,
    failures,
  };
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

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates].sort();
}

function printHumanReport(report) {
  console.log("OpenTrade Registry coverage health");
  console.log(`status: ${report.ok ? "ok" : "failed"}`);
  console.log(`sources: ${report.sourceCount}`);
  console.log(`state coverage: ${report.researchedStateCount}/${report.requiredStateCount} researched rows`);
  console.log(`territory coverage: ${report.researchedTerritoryCount}/${report.requiredTerritoryCount} researched rows`);

  if (report.failures.length === 0) {
    console.log("coverage indexes are complete and cross-linked");
    return;
  }

  console.log("failures:");
  for (const failure of report.failures) {
    console.log(`- ${failure}`);
  }
}
