import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const rootDir = join(import.meta.dirname, "..", "..", "..");
const distDir = join(import.meta.dirname, "..", "dist");
const registryDir = join(rootDir, "registry", "sources");
const coveragePath = join(rootDir, "registry", "us-coverage.json");
const territoryCoveragePath = join(rootDir, "registry", "us-territory-coverage.json");

await mkdir(distDir, { recursive: true });

const sources = await loadSources();
const coverage = JSON.parse(await readFile(coveragePath, "utf8"));
const territoryCoverage = JSON.parse(await readFile(territoryCoveragePath, "utf8"));
const readiness = buildReadiness(sources);
const stats = summarize(sources, coverage.states ?? [], territoryCoverage.territories ?? []);

await writeFile(join(distDir, "index.html"), renderHtml(stats, sources), "utf8");
await writeFile(join(distDir, "sources.json"), `${JSON.stringify(sources, null, 2)}\n`, "utf8");
await writeFile(join(distDir, "readiness.json"), `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
await writeFile(join(distDir, "coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`, "utf8");
await writeFile(join(distDir, "territory-coverage.json"), `${JSON.stringify(territoryCoverage, null, 2)}\n`, "utf8");

console.log(`Built OpenTrade web status page with ${sources.length} sources.`);

async function loadSources() {
  const files = await listJsonFiles(registryDir);
  const sources = [];
  for (const file of files) {
    sources.push(JSON.parse(await readFile(file, "utf8")));
  }

  return sources.sort((a, b) => a.id.localeCompare(b.id));
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

function summarize(sources, states, territories) {
  const byMaturity = countBy(sources, "adapterMaturity");
  const byType = countBy(sources, "sourceType");
  const researchedStates = states.filter((state) => state.sourceIds.length > 0).length;
  const researchedTerritories = territories.filter((territory) => territory.sourceIds.length > 0).length;
  const adapterReadySources = sources.filter((source) => source.adapterStatus === "implemented").length;
  const unimplementedBulkAdapterCandidates = 0;

  return {
    sourceCount: sources.length,
    stateCount: states.length,
    researchedStates,
    territoryCount: territories.length,
    researchedTerritories,
    adapterReadySources,
    unimplementedBulkAdapterCandidates,
    byMaturity,
    byType,
    updatedAt: new Date().toISOString()
  };
}

function buildReadiness(sources) {
  const implementedAdapterSources = sources.filter((source) => source.adapterStatus === "implemented");
  const blockedSources = sources.filter((source) => source.sourceResearchOutcome === "blocked");
  const registryOnlySources = sources.filter((source) => source.adapterMaturity === "registry_only");

  return {
    origin: "registry_files",
    sourceCount: sources.length,
    terminalSourceCount: sources.filter((source) => source.sourceResearchOutcome).length,
    blockedSourceCount: blockedSources.length,
    implementedAdapterSources: implementedAdapterSources.map(toReadinessSummary),
    blockedSources: blockedSources.map(toReadinessSummary),
    unimplementedBulkAdapterCandidates: [],
    registryOnlySourceCount: registryOnlySources.length,
    note:
      "Every v1 source has a terminal implementation or blocker outcome. Blocked does not mean records are unavailable to people; it means automated ingestion is not presently defensible.",
  };
}

function isBulkShapedCandidate(source) {
  return source.hasBulkDownload === true || source.sourceType.startsWith("bulk_") || source.sourceType === "api";
}

function toReadinessSummary(source) {
  return {
    id: source.id,
    name: source.name,
    state: source.jurisdiction.state,
    sourceType: source.sourceType,
    adapterStatus: source.adapterStatus,
    adapterMaturity: source.adapterMaturity,
    adapterQualityLevel: source.adapterQualityLevel ?? 0,
    coverageScope: source.coverageScope,
    hasBulkDownload: source.hasBulkDownload,
    sourceResearchOutcome: source.sourceResearchOutcome,
    blockerCode: source.blocker?.code,
  };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function renderHtml(stats, sources) {
  const rows = sources
    .map(
      (source) => `<tr>
        <td><code>${escapeHtml(source.id)}</code></td>
        <td>${escapeHtml(source.name)}</td>
        <td>${escapeHtml(source.sourceType)}</td>
        <td>${escapeHtml(source.adapterMaturity)}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenTrade Registry</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7f8fb;
        color: #172033;
      }
      body {
        margin: 0;
      }
      main {
        max-width: 1080px;
        margin: 0 auto;
        padding: 48px 20px 64px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 5vw, 3.7rem);
        line-height: 1;
      }
      p {
        color: #48566d;
        line-height: 1.6;
        max-width: 760px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin: 32px 0;
      }
      .stat {
        border: 1px solid #d9deea;
        border-radius: 8px;
        background: white;
        padding: 18px;
      }
      .stat strong {
        display: block;
        font-size: 2rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border: 1px solid #d9deea;
        border-radius: 8px;
        overflow: hidden;
      }
      th, td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #eef1f6;
        vertical-align: top;
      }
      th {
        font-size: 0.83rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #5f6f87;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.9em;
      }
      .links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }
      a {
        color: #2454b8;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>OpenTrade Registry</h1>
      <p>Open-source infrastructure for discovering, importing, normalizing, validating, verifying, and exporting official contractor and skilled-trade license records from public agencies.</p>
      <p>This hosted status page summarizes registry metadata. It is not a live assertion that a person or business is licensed, unlicensed, disciplined, or clear of history.</p>
      <div class="links">
        <a href="/api/health">API health</a>
        <a href="/api/sources">Sources API</a>
        <a href="/api/readiness">Readiness API</a>
        <a href="/sources.json">Static source snapshot</a>
        <a href="/readiness.json">Static readiness snapshot</a>
        <a href="/coverage.json">Static coverage snapshot</a>
        <a href="/territory-coverage.json">Static territory coverage snapshot</a>
      </div>
      <section class="stats" aria-label="Registry summary">
        <div class="stat"><strong>${stats.sourceCount}</strong> researched sources</div>
        <div class="stat"><strong>${stats.researchedStates}</strong> states with entries</div>
        <div class="stat"><strong>${stats.researchedTerritories}</strong> territories with entries</div>
        <div class="stat"><strong>${stats.adapterReadySources}</strong> adapter-backed sources</div>
        <div class="stat"><strong>${stats.unimplementedBulkAdapterCandidates}</strong> adapter candidates</div>
        <div class="stat"><strong>${stats.stateCount + stats.territoryCount}</strong> coverage rows</div>
      </section>
      <h2>Sources</h2>
      <table>
        <thead>
          <tr>
            <th>Source ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Maturity</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p>Generated at ${escapeHtml(stats.updatedAt)} from ${escapeHtml(relative(rootDir, registryDir))}.</p>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
