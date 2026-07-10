import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(root, "registry", "board-inventory.json");
const auditsPath = join(root, "registry", "board-audits.json");
const check = process.argv.includes("--check");
const sources = await readSources(join(root, "registry", "sources"));
const audits = await readAudits(auditsPath, sources);
const inventory = {
  schemaVersion: "2.0",
  completeness: "representative_source_baseline",
  scope: {
    jurisdictions: "states_dc_major_territories",
    municipalLicensing: "excluded",
    notes: [
      "This baseline contains one board row per existing source and does not yet claim complete board-level coverage.",
      "Municipal contractor and trade licensing remains outside the project scope unless separately registered.",
    ],
  },
  boards: [
    ...sources.filter((source) => !audits.sourceIds.has(source.id)).map(toBoardEntry),
    ...audits.entries,
  ].toSorted((left, right) => left.id.localeCompare(right.id)),
};
const next = `${JSON.stringify(inventory, null, 2)}\n`;

if (check) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== next) {
    console.error(`${relative(root, outputPath)} is stale. Run corepack pnpm board:inventory:generate.`);
    process.exitCode = 1;
  }
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, next, "utf8");
  console.log(`Wrote ${inventory.boards.length} board rows to ${relative(root, outputPath)}.`);
}

function toBoardEntry(source) {
  const evidence = source.researchEvidence[0];
  return {
    id: source.id,
    jurisdiction: source.jurisdiction,
    boardName: source.name,
    agencyName: source.agency.name,
    inventoryStatus: "source_baseline",
    identity: {
      type: "source_endpoint",
      canonicalName: source.name,
    },
    officialUrl: source.officialLookupUrl ?? source.sourceUrl,
    sourceIds: [source.id],
    trades: source.tradeCoverage.length > 0 ? source.tradeCoverage : ["unknown"],
    accessPath: mapAccessPath(source),
    coverageLimitations: source.knownExclusions,
    evidence: {
      url: evidence.url,
      reviewedAt: source.researchReviewedAt,
      note: evidence.note,
    },
  };
}

function mapAccessPath(source) {
  if (source.sourceResearchOutcome === "production_ready") return "production_adapter";
  if (source.sourceResearchOutcome === "network_opt_in") return "network_opt_in";
  if (source.sourceResearchOutcome === "local_file_adapter") return "local_file";
  if (source.sourceResearchOutcome === "deprecated") return "deprecated";
  return source.officialLookupUrl ? "manual_handoff" : "blocked";
}

async function readSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sources.push(...await readSources(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) {
      sources.push(JSON.parse(await readFile(path, "utf8")));
    }
  }
  return sources.sort((left, right) => left.id.localeCompare(right.id));
}

async function readAudits(path, sources) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const sourceIds = new Set();
  for (const audit of manifest.audits) {
    if (audit.inventoryStatus !== "board_verified") {
      throw new Error(`Board audit ${audit.id} must have inventoryStatus board_verified.`);
    }
    if (audit.identity?.type === "source_endpoint") {
      throw new Error(`Board audit ${audit.id} cannot use a source_endpoint identity.`);
    }
    for (const sourceId of audit.sourceIds) {
      const source = sourceById.get(sourceId);
      if (!source) throw new Error(`Board audit ${audit.id} references unknown source ${sourceId}.`);
      if (sourceIds.has(sourceId)) throw new Error(`Source ${sourceId} appears in more than one board audit.`);
      if (source.jurisdiction.state !== audit.jurisdiction.state) {
        throw new Error(`Board audit ${audit.id} and source ${sourceId} must have the same jurisdiction.`);
      }
      sourceIds.add(sourceId);
    }
  }
  return { entries: manifest.audits, sourceIds };
}
