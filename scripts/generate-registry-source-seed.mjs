import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "registry", "sources");
const outputPath = join(root, "supabase", "seeds", "registry_sources.sql");

const files = await listJsonFiles(sourceRoot);
const sources = [];

for (const file of files) {
  sources.push(JSON.parse(await readFile(file, "utf8")));
}

sources.sort((a, b) => a.id.localeCompare(b.id));

const columns = [
  "id",
  "name",
  "jurisdiction",
  "agency",
  "source_type",
  "source_url",
  "documentation_url",
  "adapter_status",
  "adapter_maturity",
  "source_discovery_status",
  "coverage_scope",
  "redistribution_status",
  "metadata",
  "last_verified_at",
];

const lines = [
  "-- Generated from registry/sources. Do not edit by hand.",
  "insert into public.registry_sources (",
  `  ${columns.join(",\n  ")}`,
  ") values",
];

for (let index = 0; index < sources.length; index += 1) {
  const source = sources[index];
  const metadata = { ...source };
  for (const key of [
    "id",
    "name",
    "jurisdiction",
    "agency",
    "sourceType",
    "sourceUrl",
    "documentationUrl",
    "adapterStatus",
    "adapterMaturity",
    "sourceDiscoveryStatus",
    "coverageScope",
    "redistributionStatus",
    "lastVerifiedAt",
  ]) {
    delete metadata[key];
  }

  const values = [
    sqlText(source.id),
    sqlText(source.name),
    sqlJson(source.jurisdiction),
    sqlJson(source.agency),
    sqlText(source.sourceType),
    sqlText(source.sourceUrl),
    sqlNullableText(source.documentationUrl),
    sqlText(source.adapterStatus),
    sqlText(source.adapterMaturity),
    sqlText(source.sourceDiscoveryStatus),
    sqlText(source.coverageScope),
    sqlText(source.redistributionStatus),
    sqlJson(metadata),
    sqlNullableTimestamp(source.lastVerifiedAt),
  ];

  lines.push(`  (${values.join(", ")})${index === sources.length - 1 ? "" : ","}`);
}

lines.push(
  "on conflict (id) do update set",
  "  name = excluded.name,",
  "  jurisdiction = excluded.jurisdiction,",
  "  agency = excluded.agency,",
  "  source_type = excluded.source_type,",
  "  source_url = excluded.source_url,",
  "  documentation_url = excluded.documentation_url,",
  "  adapter_status = excluded.adapter_status,",
  "  adapter_maturity = excluded.adapter_maturity,",
  "  source_discovery_status = excluded.source_discovery_status,",
  "  coverage_scope = excluded.coverage_scope,",
  "  redistribution_status = excluded.redistribution_status,",
  "  metadata = excluded.metadata,",
  "  last_verified_at = excluded.last_verified_at,",
  "  updated_at = now();",
  ""
);

await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${sources.length} source rows to ${outputPath}`);

async function listJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

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

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNullableText(value) {
  return value == null ? "null" : sqlText(value);
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

function sqlNullableTimestamp(value) {
  return value == null ? "null" : `${sqlText(value)}::timestamptz`;
}
