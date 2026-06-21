import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceRegistryEntrySchema } from "@opentrade/core";

const coverageStatuses = [
  "not_started",
  "source_identified",
  "registry_entry_added",
  "adapter_planned",
  "fixture_supported",
  "local_file_supported",
  "network_opt_in_supported",
] as const;

type CoverageStatus = (typeof coverageStatuses)[number];

type UsCoverageIndex = {
  country: "US";
  coverageStatuses: CoverageStatus[];
  states: {
    state: string;
    status: CoverageStatus;
    sourceIds: string[];
    notes: string;
  }[];
};

describe("source registry", () => {
  it("validates every source registry entry", async () => {
    const files = await listJsonFiles(join(process.cwd(), "registry", "sources"));
    expect(files.length).toBeGreaterThanOrEqual(4);

    const parsed = [];
    for (const file of files) {
      parsed.push(sourceRegistryEntrySchema.parse(JSON.parse(await readFile(file, "utf8"))));
    }

    expect(parsed.map((entry) => entry.id).sort()).toEqual([
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.construction",
      "us.tx.tdlr.all_licenses",
    ]);
    expect(parsed.every((entry) => entry.redistributionStatus === "unknown")).toBe(true);
    expect(parsed.every((entry) => entry.sourceDiscoveryStatus === "researched")).toBe(true);
    expect(parsed.find((entry) => entry.id === "us.fl.dbpr.construction")?.adapterMaturity).toBe("local_file_adapter");
    expect(parsed.find((entry) => entry.id === "us.tx.tdlr.all_licenses")?.adapterMaturity).toBe("fixture_adapter");
    expect(
      parsed
        .filter((entry) => !["us.fl.dbpr.construction", "us.tx.tdlr.all_licenses"].includes(entry.id))
        .every((entry) => entry.adapterMaturity === "registry_only"),
    ).toBe(true);
  });

  it("validates US coverage index and source references", async () => {
    const coverage = JSON.parse(await readFile(join(process.cwd(), "registry", "us-coverage.json"), "utf8")) as UsCoverageIndex;
    const sourceFiles = await listJsonFiles(join(process.cwd(), "registry", "sources"));
    const sourceIds = new Set(
      await Promise.all(
        sourceFiles.map(async (file) => sourceRegistryEntrySchema.parse(JSON.parse(await readFile(file, "utf8"))).id),
      ),
    );
    const expectedStates = [
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

    expect(coverage.country).toBe("US");
    expect(coverage.states.map((entry) => entry.state)).toEqual(expectedStates);
    expect(new Set(coverage.states.map((entry) => entry.state)).size).toBe(51);
    expect(coverage.coverageStatuses).toEqual(coverageStatuses);
    for (const state of coverage.states) {
      expect(coverageStatuses).toContain(state.status);
      expect(state.notes.length).toBeGreaterThan(0);
      for (const sourceId of state.sourceIds) {
        expect(sourceIds.has(sourceId), `${state.state} references unknown source ${sourceId}`).toBe(true);
      }
    }
    expect(coverage.states.find((entry) => entry.state === "FL")?.status).toBe("local_file_supported");
    expect(coverage.states.find((entry) => entry.state === "CA")?.status).toBe("registry_entry_added");
    expect(coverage.states.find((entry) => entry.state === "TX")?.status).toBe("fixture_supported");
    expect(coverage.states.find((entry) => entry.state === "AZ")?.status).toBe("registry_entry_added");
  });
});

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

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
