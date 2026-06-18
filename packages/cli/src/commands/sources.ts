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
    console.log(`${entry.id}\t${entry.adapterStatus}\t${entry.name}`);
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
  console.log(`status: ${entry.adapterStatus}`);
  console.log(`redistribution: ${entry.redistributionStatus}`);
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

