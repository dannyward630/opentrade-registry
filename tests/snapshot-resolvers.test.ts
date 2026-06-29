import { describe, expect, it, vi } from "vitest";
import { resolveOfficialSnapshotUrl } from "@opentrade-registry/registry";
import type { SourceRegistryEntry } from "@opentrade-registry/core";

describe("official snapshot URL resolution", () => {
  it("returns direct official bulk files unchanged", async () => {
    await expect(resolveOfficialSnapshotUrl(source({
      id: "us.fl.dbpr.construction",
      sourceUrl: "https://example.gov/licenses.csv",
    }))).resolves.toEqual({ url: "https://example.gov/licenses.csv", method: "direct" });
  });

  it("converts official Socrata pages to stable CSV export URLs", async () => {
    await expect(resolveOfficialSnapshotUrl(source({
      id: "us.wa.lni.contractors",
      sourceUrl: "https://data.wa.gov/Labor/L-I-Contractor-License-Data-General/m8qx-ubtq",
    }))).resolves.toEqual({
      url: "https://data.wa.gov/api/views/m8qx-ubtq/rows.csv?accessType=DOWNLOAD",
      method: "socrata_export",
    });
  });

  it("discovers the newest dated CSV from an official posting page", async () => {
    const fetchPage = vi.fn(async () => `
      <a href="/sites/default/files/2026-06/active-contractors-2026-06-01.csv">Older CSV</a>
      <a href="/sites/default/files/2026-06/active-contractors-2026-06-29.csv">Current CSV</a>
    `);
    await expect(resolveOfficialSnapshotUrl(source({
      id: "us.az.roc.contractors",
      sourceUrl: "https://roc.az.gov/posting-list",
    }), { fetchPage })).resolves.toEqual({
      url: "https://roc.az.gov/sites/default/files/2026-06/active-contractors-2026-06-29.csv",
      method: "dated_page_link",
    });
    expect(fetchPage).toHaveBeenCalledWith("https://roc.az.gov/posting-list", expect.any(Object));
  });

  it("refuses page discovery that does not expose an official data file", async () => {
    await expect(resolveOfficialSnapshotUrl(source({
      id: "us.az.roc.contractors",
      sourceUrl: "https://roc.az.gov/posting-list",
    }), { fetchPage: async () => "<html>No file today</html>" })).rejects.toThrow(/no supported data file/i);
  });
});

function source(overrides: Pick<SourceRegistryEntry, "id" | "sourceUrl">): SourceRegistryEntry {
  return {
    ...overrides,
    name: "Fixture source",
    jurisdiction: { country: "US", state: "WA" },
    agency: { name: "Fixture agency", url: new URL(overrides.sourceUrl).origin },
    sourceType: "bulk_csv",
    tradeCoverage: ["contracting"],
    licenseTypesIncluded: ["contractor"],
    knownExclusions: ["Municipal licenses."],
    hasBulkDownload: true,
    hasLiveLookup: false,
    requiresJavaScript: false,
    requiresCaptcha: false,
    requiresAccount: false,
    redistributionStatus: "unknown",
    adapterStatus: "implemented",
    sourceDiscoveryStatus: "researched",
    adapterMaturity: "network_opt_in",
    coverageScope: "statewide",
  };
}
