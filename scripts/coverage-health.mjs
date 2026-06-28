import { access, readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

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
const COVERAGE_STATUS_BY_MATURITY = {
  registry_only: "registry_entry_added",
  fixture_adapter: "fixture_supported",
  local_file_adapter: "local_file_supported",
  network_opt_in: "network_opt_in_supported",
  production_ready: "production_ready_supported",
  blocked: "blocked",
  deprecated: "deprecated",
};
const COVERAGE_STATUS_RANK = {
  not_started: 0,
  source_identified: 1,
  registry_entry_added: 2,
  adapter_planned: 3,
  fixture_supported: 4,
  local_file_supported: 5,
  network_opt_in_supported: 6,
  production_ready_supported: 7,
  blocked: 8,
  deprecated: 9,
};
const RUNTIME_MATURITIES = new Set(["fixture_adapter", "local_file_adapter", "network_opt_in", "production_ready"]);
const options = new Set(process.argv.slice(2));
const root = process.cwd();
const registryRoot = join(root, "registry", "sources");

const sourceFiles = await loadSources(registryRoot);
const sources = sourceFiles.map(({ entry }) => entry);
const coverage = JSON.parse(await readFile(join(root, "registry", "us-coverage.json"), "utf8"));
const territoryCoverage = JSON.parse(await readFile(join(root, "registry", "us-territory-coverage.json"), "utf8"));
const report = await buildCoverageHealthReport(sourceFiles, coverage.states, territoryCoverage.territories);

if (options.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHumanReport(report);
}

if (!report.ok) {
  process.exitCode = 6;
}

async function buildCoverageHealthReport(sourceFiles, states, territories) {
  const sources = sourceFiles.map(({ entry }) => entry);
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
  const sourcePathMismatches = sourceFiles
    .filter(({ file, entry }) => {
      const state = entry.jurisdiction?.state?.toLowerCase();
      const relativeParts = relative(registryRoot, file).split(/[\\/]/);
      return relativeParts[0] !== "us" || relativeParts[1] !== state || !entry.id.startsWith(`us.${state}.`);
    })
    .map(({ file, entry }) => ({ sourceId: entry.id, file: relative(root, file) }))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const adapterPackageMismatches = sources
    .filter((source) => {
      const state = source.jurisdiction?.state?.toLowerCase();
      return source.adapterPackage && !source.adapterPackage.startsWith(`@opentrade-registry/adapter-${state}-`);
    })
    .map((source) => ({ sourceId: source.id, adapterPackage: source.adapterPackage }))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const runtimeSourcesWithoutFixtures = sources
    .filter((source) => RUNTIME_MATURITIES.has(source.adapterMaturity) && !source.testFixturePath)
    .map((source) => source.id)
    .sort();
  const missingFixturePaths = (
    await Promise.all(
      sources
        .filter((source) => RUNTIME_MATURITIES.has(source.adapterMaturity) && source.testFixturePath)
        .map(async (source) => {
          try {
            await access(join(root, source.testFixturePath));
            return null;
          } catch {
            return { sourceId: source.id, testFixturePath: source.testFixturePath };
          }
        }),
    )
  )
    .filter(Boolean)
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const implementedSourcesMissingLevel4 = sources
    .filter((source) => source.adapterStatus === "implemented" && source.adapterQualityLevel !== 4)
    .map((source) => source.id)
    .sort();
  const implementedSourcesMissingVerificationReview = sources
    .filter(
      (source) =>
        source.adapterStatus === "implemented" &&
        (!source.verificationReviewedAt || !source.verificationCaveats?.length || !source.verificationNotes),
    )
    .map((source) => source.id)
    .sort();
  const coverageStatusMismatches = [...states.map((entry) => ({ ...entry, kind: "state" })), ...territories.map((entry) => ({ ...entry, kind: "territory" }))]
    .filter((entry) => entry.sourceIds.length > 0)
    .map((entry) => {
      const expectedStatus = expectedCoverageStatus(entry.sourceIds.map((sourceId) => sourcesById.get(sourceId)).filter(Boolean));
      return expectedStatus && entry.status !== expectedStatus
        ? {
            code: entry.state ?? entry.territory,
            kind: entry.kind,
            status: entry.status,
            expectedStatus,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.code.localeCompare(b.code));

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
    ...sourcePathMismatches.map((entry) => `Source path/id jurisdiction mismatch: ${entry.sourceId} file=${entry.file}`),
    ...adapterPackageMismatches.map((entry) => `Adapter package does not include source state code: ${entry.sourceId} package=${entry.adapterPackage}`),
    ...runtimeSourcesWithoutFixtures.map((sourceId) => `Runtime-capable source has no test fixture path: ${sourceId}`),
    ...missingFixturePaths.map((entry) => `Runtime-capable source fixture path is missing: ${entry.sourceId} path=${entry.testFixturePath}`),
    ...implementedSourcesMissingLevel4.map((sourceId) => `Implemented source is missing Level 4 quality metadata: ${sourceId}`),
    ...implementedSourcesMissingVerificationReview.map((sourceId) => `Implemented source is missing verification review metadata: ${sourceId}`),
    ...coverageStatusMismatches.map(
      (entry) => `Coverage status mismatch: ${entry.code} status=${entry.status} expected=${entry.expectedStatus}`,
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
    sourcePathMismatches,
    adapterPackageMismatches,
    runtimeSourcesWithoutFixtures,
    missingFixturePaths,
    implementedSourcesMissingLevel4,
    implementedSourcesMissingVerificationReview,
    coverageStatusMismatches,
    failures,
  };
}

async function loadSources(directory) {
  const files = await listJsonFiles(directory);
  const entries = await Promise.all(files.map(async (file) => ({ file, entry: JSON.parse(await readFile(file, "utf8")) })));
  return entries.sort((a, b) => a.entry.id.localeCompare(b.entry.id));
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

function expectedCoverageStatus(sources) {
  let expectedStatus = null;

  for (const source of sources) {
    const status = COVERAGE_STATUS_BY_MATURITY[source.adapterMaturity];
    if (!status) {
      continue;
    }

    if (!expectedStatus || COVERAGE_STATUS_RANK[status] > COVERAGE_STATUS_RANK[expectedStatus]) {
      expectedStatus = status;
    }
  }

  return expectedStatus;
}

function printHumanReport(report) {
  console.log("OpenTrade Registry coverage health");
  console.log(`status: ${report.ok ? "ok" : "failed"}`);
  console.log(`sources: ${report.sourceCount}`);
  console.log(`state coverage: ${report.researchedStateCount}/${report.requiredStateCount} researched rows`);
  console.log(`territory coverage: ${report.researchedTerritoryCount}/${report.requiredTerritoryCount} researched rows`);

  if (report.failures.length === 0) {
    console.log("coverage indexes are complete, cross-linked, and maturity-aligned");
    return;
  }

  console.log("failures:");
  for (const failure of report.failures) {
    console.log(`- ${failure}`);
  }
}
