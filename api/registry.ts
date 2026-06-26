import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildSourceReadiness, sourceRegistryEntrySchema, type SourceReadiness, type SourceRegistryEntry } from "@opentrade/core";

export type SourceApiOrigin = "database" | "registry_files";

export type SourceApiResult = {
  origin: SourceApiOrigin;
  sources: SourceRegistryEntry[];
  databaseError?: string;
};

export type SourceReadinessApiResult = SourceReadiness & {
  origin: SourceApiOrigin;
  databaseError?: string;
};

export type SourceMirrorMismatch = {
  id: string;
  reason: "missing_in_database" | "extra_in_database" | "content_mismatch";
};

export type SourceMirrorComparison = {
  sourceMetadataMatchesFiles: boolean;
  sourceMetadataMismatchCount: number;
  sourceMetadataMismatches: SourceMirrorMismatch[];
};

type RegistryDatabaseRow = {
  id: string;
  name: string;
  jurisdiction: unknown;
  agency: unknown;
  source_type: string;
  source_url: string;
  documentation_url: string | null;
  adapter_status: string;
  adapter_maturity: string;
  source_discovery_status: string;
  coverage_scope: string;
  redistribution_status: string;
  metadata: Record<string, unknown> | null;
  last_verified_at: string | null;
};

export type RegistryDatabaseClient = {
  from(table: "registry_sources"): {
    select(columns: string, options?: { count?: "exact"; head?: boolean }): unknown;
  };
};

type QueryBuilder = {
  order(column: string, options: { ascending: boolean }): Promise<{ data: RegistryDatabaseRow[] | null; error: { message: string } | null }>;
};

export async function loadSourcesForApi(options: { rootDir?: string; databaseClient?: RegistryDatabaseClient | null } = {}): Promise<SourceApiResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const databaseClient = options.databaseClient ?? createDatabaseClientFromEnv();
  const fileSources = await loadSourcesFromFiles(rootDir);

  if (databaseClient) {
    try {
      return {
        origin: "database",
        sources: await loadSourcesFromDatabase(databaseClient, fileSources),
      };
    } catch (error) {
      return {
        origin: "registry_files",
        sources: fileSources,
        databaseError: error instanceof Error ? error.message : "Unknown database source loading error",
      };
    }
  }

  return {
    origin: "registry_files",
    sources: fileSources,
  };
}

export async function loadSourceReadinessForApi(
  options: { rootDir?: string; databaseClient?: RegistryDatabaseClient | null } = {},
): Promise<SourceReadinessApiResult> {
  const result = await loadSourcesForApi(options);
  return {
    origin: result.origin,
    ...buildSourceReadiness(result.sources),
    databaseError: result.databaseError,
  };
}

export async function loadSourcesFromFiles(rootDir = process.cwd()): Promise<SourceRegistryEntry[]> {
  const sourceRoot = join(rootDir, "registry", "sources");
  const files = await listJsonFiles(sourceRoot);
  const sources = [];

  for (const file of files) {
    const content = JSON.parse(await readFile(file, "utf8"));
    sources.push(sourceRegistryEntrySchema.parse(content));
  }

  return sources.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadSourcesFromDatabase(client: RegistryDatabaseClient, fileFallbacks: SourceRegistryEntry[] = []): Promise<SourceRegistryEntry[]> {
  const query = client.from("registry_sources").select("*") as QueryBuilder;
  const { data, error } = await query.order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const fallbackById = new Map(fileFallbacks.map((source) => [source.id, source]));
  return (data ?? []).map((row) => mapDatabaseRowToSource(row, fallbackById.get(row.id)));
}

export function compareSourceMirrors(fileSources: SourceRegistryEntry[], databaseSources: SourceRegistryEntry[]): SourceMirrorComparison {
  const fileById = new Map(fileSources.map((source) => [source.id, source]));
  const databaseById = new Map(databaseSources.map((source) => [source.id, source]));
  const mismatches: SourceMirrorMismatch[] = [];

  for (const source of fileSources) {
    const databaseSource = databaseById.get(source.id);
    if (!databaseSource) {
      mismatches.push({ id: source.id, reason: "missing_in_database" });
      continue;
    }

    if (stableStringify(databaseSource) !== stableStringify(source)) {
      mismatches.push({ id: source.id, reason: "content_mismatch" });
    }
  }

  for (const source of databaseSources) {
    if (!fileById.has(source.id)) {
      mismatches.push({ id: source.id, reason: "extra_in_database" });
    }
  }

  mismatches.sort((a, b) => a.id.localeCompare(b.id) || a.reason.localeCompare(b.reason));

  return {
    sourceMetadataMatchesFiles: mismatches.length === 0,
    sourceMetadataMismatchCount: mismatches.length,
    sourceMetadataMismatches: mismatches.slice(0, 10),
  };
}

export async function countSourcesFromDatabase(client: RegistryDatabaseClient): Promise<number> {
  const query = client.from("registry_sources").select("id", { count: "exact", head: true }) as Promise<{
    count: number | null;
    error: { message: string } | null;
  }>;
  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export function createDatabaseClientFromEnv(): RegistryDatabaseClient | null {
  const supabaseUrl = process.env.OPENTRADE_SUPABASE_URL;
  const supabaseAnonKey = process.env.OPENTRADE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  }) as RegistryDatabaseClient;
}

function mapDatabaseRowToSource(row: RegistryDatabaseRow, fallback?: SourceRegistryEntry): SourceRegistryEntry {
  return sourceRegistryEntrySchema.parse({
    ...(fallback ?? {}),
    ...(row.metadata ?? {}),
    id: row.id,
    name: row.name,
    jurisdiction: row.jurisdiction,
    agency: row.agency,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    documentationUrl: row.documentation_url,
    adapterStatus: row.adapter_status,
    adapterMaturity: row.adapter_maturity,
    sourceDiscoveryStatus: row.source_discovery_status,
    coverageScope: row.coverage_scope,
    redistributionStatus: row.redistribution_status,
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at).toISOString() : fallback?.lastVerifiedAt,
  });
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortJson((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
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
