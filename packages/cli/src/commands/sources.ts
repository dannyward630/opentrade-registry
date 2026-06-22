import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { sourceRegistryEntrySchema, type SourceRegistryEntry } from "@opentrade/core";

export async function loadSourceRegistry(rootDir: string): Promise<SourceRegistryEntry[]> {
  const sourceRoot = join(rootDir, "registry", "sources");
  const files = await listJsonFiles(sourceRoot);
  const entries: SourceRegistryEntry[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    entries.push(sourceRegistryEntrySchema.parse(JSON.parse(content)));
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listSources(rootDir: string, options: { json?: boolean }) {
  const entries = await loadSourceRegistry(rootDir);
  if (options.json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  for (const entry of entries) {
    console.log(`${entry.id}\t${entry.adapterStatus}\t${entry.adapterMaturity}\tlevel_${entry.adapterQualityLevel ?? 0}\t${entry.name}`);
  }
}

export async function showSource(rootDir: string, sourceId: string, options: { json?: boolean }) {
  const entries = await loadSourceRegistry(rootDir);
  const entry = entries.find((candidate) => candidate.id === sourceId);
  if (!entry) {
    throw Object.assign(new Error(`Unknown source: ${sourceId}`), { exitCode: 2 });
  }

  if (options.json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  console.log(`${entry.name}`);
  console.log(`id: ${entry.id}`);
  console.log(`agency: ${entry.agency.name}`);
  console.log(`type: ${entry.sourceType}`);
  console.log(`url: ${entry.sourceUrl}`);
  if (entry.officialLookupUrl) {
    console.log(`lookup: ${entry.officialLookupUrl}`);
  }
  console.log(`status: ${entry.adapterStatus}`);
  console.log(`maturity: ${entry.adapterMaturity}`);
  console.log(`quality level: ${entry.adapterQualityLevel ?? 0}`);
  console.log(`coverage: ${entry.coverageScope}`);
  console.log(`discovery: ${entry.sourceDiscoveryStatus}`);
  console.log(`redistribution: ${entry.redistributionStatus}`);
  if (entry.testFixturePath) {
    console.log(`fixture: ${entry.testFixturePath}`);
  }
  if (entry.officialBulkDownloadNotes) {
    console.log(`bulk notes: ${entry.officialBulkDownloadNotes}`);
  }
  if (entry.verificationReviewedAt) {
    console.log(`verification reviewed: ${entry.verificationReviewedAt}`);
  }
  if (entry.verificationCaveats && entry.verificationCaveats.length > 0) {
    console.log("verification caveats:");
    for (const caveat of entry.verificationCaveats) {
      console.log(`- ${caveat}`);
    }
  }
  if (entry.verificationNotes) {
    console.log(`verification notes: ${entry.verificationNotes}`);
  }
  if (entry.knownExclusions.length > 0) {
    console.log("known exclusions:");
    for (const exclusion of entry.knownExclusions) {
      console.log(`- ${exclusion}`);
    }
  }
  if (entry.publicRecordsNotes) {
    console.log(`public records: ${entry.publicRecordsNotes}`);
  }
  if (entry.researchNotes) {
    console.log(`research: ${entry.researchNotes}`);
  }
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}
