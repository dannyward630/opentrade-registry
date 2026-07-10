import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { loadSnapshotImportSourcePolicy } from "../services/ingestion-worker/src/source-policy.js";

describe("snapshot import source policy", () => {
  it("loads source authority and installed adapter version outside request JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "opentrade-policy-"));
    const sourceDirectory = join(root, "sources", "us", "fl");
    const packageDirectory = join(root, "adapter", "dist");
    await mkdir(sourceDirectory, { recursive: true });
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, "source.json"), JSON.stringify(sourceEntry()));
    await writeFile(join(root, "adapter", "package.json"), JSON.stringify({ name: "@opentrade-registry/adapter-example", version: "2.3.4" }));
    await writeFile(join(packageDirectory, "index.js"), "export {};\n");

    await expect(loadSnapshotImportSourcePolicy({
      registryRoot: root,
      sourceId: "us.fl.example",
      resolvePackageEntry: async () => pathToFileURL(join(packageDirectory, "index.js")).href,
    })).resolves.toEqual({
      sourceId: "us.fl.example",
      allowedSourceHosts: ["data.example.gov"],
      adapterPackage: "@opentrade-registry/adapter-example",
      adapterVersion: "2.3.4",
      redistributionStatus: "unknown",
    });
  });

  it("rejects unregistered sources and mismatched installed packages", async () => {
    const root = await mkdtemp(join(tmpdir(), "opentrade-policy-error-"));
    const sourceDirectory = join(root, "sources");
    const packageDirectory = join(root, "adapter", "dist");
    await mkdir(sourceDirectory, { recursive: true });
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, "source.json"), JSON.stringify(sourceEntry()));
    await writeFile(join(root, "adapter", "package.json"), JSON.stringify({ name: "@opentrade-registry/wrong", version: "1.0.0" }));
    await writeFile(join(packageDirectory, "index.js"), "export {};\n");
    const resolvePackageEntry = async () => pathToFileURL(join(packageDirectory, "index.js")).href;

    await expect(loadSnapshotImportSourcePolicy({ registryRoot: root, sourceId: "us.tx.missing", resolvePackageEntry })).rejects.toThrow("not registered");
    await expect(loadSnapshotImportSourcePolicy({ registryRoot: root, sourceId: "us.fl.example", resolvePackageEntry })).rejects.toThrow("does not match");
  });
});

function sourceEntry() {
  return {
    schemaVersion: "1.0",
    id: "us.fl.example",
    name: "Example Licenses",
    jurisdiction: { country: "US", state: "FL" },
    agency: { name: "Example Agency" },
    sourceType: "bulk_csv",
    sourceUrl: "https://data.example.gov/licenses.csv",
    tradeCoverage: ["construction"],
    licenseTypesIncluded: ["contractor"],
    knownExclusions: ["Municipal licenses are excluded."],
    hasBulkDownload: true,
    hasLiveLookup: false,
    requiresJavaScript: false,
    requiresCaptcha: false,
    requiresAccount: false,
    redistributionStatus: "unknown",
    adapterStatus: "implemented",
    sourceDiscoveryStatus: "researched",
    adapterMaturity: "local_file_adapter",
    adapterQualityLevel: 4,
    coverageScope: "state_agency_partial",
    adapterPackage: "@opentrade-registry/adapter-example",
    sourceResearchOutcome: "local_file_adapter",
    researchReviewedAt: "2026-07-10T00:00:00.000Z",
    nextReviewAt: "2027-01-10T00:00:00.000Z",
    researchEvidence: [{ url: "https://data.example.gov/licenses.csv", checkedAt: "2026-07-10T00:00:00.000Z", note: "Reviewed." }],
  };
}
