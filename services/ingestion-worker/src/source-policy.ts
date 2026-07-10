import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceRegistryEntryV1Schema, type SourceRegistryEntryV1 } from "@opentrade-registry/core";

export type SnapshotImportSourcePolicy = {
  sourceId: string;
  allowedSourceHosts: string[];
  adapterPackage: string;
  adapterVersion: string;
  redistributionStatus: SourceRegistryEntryV1["redistributionStatus"];
};

export async function loadSnapshotImportSourcePolicy(input: {
  registryRoot: string;
  sourceId: string;
  resolvePackageEntry?: (packageName: string) => Promise<string>;
}): Promise<SnapshotImportSourcePolicy> {
  const source = await findSource(join(input.registryRoot, "sources"), input.sourceId);
  if (!source) throw new Error(`Source ${input.sourceId} is not registered.`);
  if (source.adapterStatus !== "implemented" || !source.adapterPackage) {
    throw new Error(`Source ${input.sourceId} does not have an implemented adapter.`);
  }
  const packageEntry = await (input.resolvePackageEntry ?? resolvePackageEntry)(source.adapterPackage);
  const packageJson = JSON.parse(await readFile(join(dirname(dirname(fileURLToPath(packageEntry))), "package.json"), "utf8")) as { name?: unknown; version?: unknown };
  if (packageJson.name !== source.adapterPackage || typeof packageJson.version !== "string" || !packageJson.version) {
    throw new Error(`Installed adapter metadata does not match ${source.adapterPackage}.`);
  }
  return {
    sourceId: source.id,
    allowedSourceHosts: [new URL(source.sourceUrl).hostname.toLowerCase()],
    adapterPackage: source.adapterPackage,
    adapterVersion: packageJson.version,
    redistributionStatus: source.redistributionStatus,
  };
}

async function findSource(directory: string, sourceId: string): Promise<SourceRegistryEntryV1 | null> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findSource(path, sourceId);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const source = sourceRegistryEntryV1Schema.parse(JSON.parse(await readFile(path, "utf8")));
      if (source.id === sourceId) return source;
    }
  }
  return null;
}

async function resolvePackageEntry(packageName: string): Promise<string> {
  return import.meta.resolve(packageName);
}
