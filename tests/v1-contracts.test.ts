import { describe, expect, it } from "vitest";
import {
  OPENTRADE_API_VERSION,
  OPENTRADE_CANONICAL_SCHEMA_VERSION,
  OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION,
  parseCanonicalTradeLicenseRecord,
  parseSourceRegistryEntry,
  sourceRegistryEntryV1Schema,
} from "@opentrade/core";

describe("v1 public contracts", () => {
  it("publishes stable contract version identifiers", () => {
    expect(OPENTRADE_API_VERSION).toBe("1.0");
    expect(OPENTRADE_CANONICAL_SCHEMA_VERSION).toBe("1.0");
    expect(OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION).toBe("1.0");
  });

  it("upgrades an unversioned v0.2 canonical record while preserving provenance", () => {
    const record = parseCanonicalTradeLicenseRecord({
      sourceId: "us.fl.dbpr.construction",
      jurisdiction: { country: "US", state: "FL" },
      agency: { name: "Florida DBPR" },
      source: {
        sourceUrl: "https://example.gov/licenses.csv",
        sourceType: "bulk_csv",
        fetchedAt: "2026-06-27T00:00:00.000Z",
      },
      license: {
        licenseNumber: "CGC1234567",
        licenseNumberNormalized: "CGC1234567",
      },
      identity: {},
      status: { normalized: "active" },
      dates: {},
      contact: {},
      raw: { record: { License: "CGC1234567" }, fingerprint: "fixture-fingerprint" },
    });

    expect(record.schemaVersion).toBe("1.0");
    expect(record.raw.record).toEqual({ License: "CGC1234567" });
    expect(record.source.sourceUrl).toBe("https://example.gov/licenses.csv");
  });

  it("reads an unversioned v0.2 source entry without inventing a terminal outcome", () => {
    const result = parseSourceRegistryEntry({
      id: "us.fl.example.contractors",
      name: "Example Contractor Licenses",
      jurisdiction: { country: "US", state: "FL" },
      agency: { name: "Example Agency" },
      sourceType: "bulk_csv",
      sourceUrl: "https://example.gov/licenses.csv",
      tradeCoverage: [],
      licenseTypesIncluded: [],
      knownExclusions: [],
      hasBulkDownload: true,
      hasLiveLookup: false,
      requiresJavaScript: false,
      requiresCaptcha: false,
      requiresAccount: false,
      redistributionStatus: "unknown",
      adapterStatus: "planned",
      sourceDiscoveryStatus: "researched",
      adapterMaturity: "registry_only",
      coverageScope: "state_agency_partial",
    });

    expect(result.schemaVersion).toBe("0.2");
    expect(result.needsV1CompletionReview).toBe(true);
    expect(result.entry.id).toBe("us.fl.example.contractors");
  });

  it("requires evidence and a review date for a terminal v1 source outcome", () => {
    const result = sourceRegistryEntryV1Schema.safeParse({
      schemaVersion: "1.0",
      id: "us.fl.example.contractors",
      name: "Example Contractor Licenses",
      jurisdiction: { country: "US", state: "FL" },
      agency: { name: "Example Agency" },
      sourceType: "bulk_csv",
      sourceUrl: "https://example.gov/licenses.csv",
      tradeCoverage: [],
      licenseTypesIncluded: [],
      knownExclusions: ["Local permits are outside this source."],
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
      sourceResearchOutcome: "local_file_adapter",
      researchReviewedAt: "2026-06-27T00:00:00.000Z",
      nextReviewAt: "2026-12-27T00:00:00.000Z",
      researchEvidence: [
        {
          url: "https://example.gov/licenses.csv",
          checkedAt: "2026-06-27T00:00:00.000Z",
          note: "Official CSV download and field shape reviewed.",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a blocked v1 source without structured blocker evidence", () => {
    const result = sourceRegistryEntryV1Schema.safeParse({
      schemaVersion: "1.0",
      id: "us.vt.example.contractors",
      name: "Example Contractor Lookup",
      jurisdiction: { country: "US", state: "VT" },
      agency: { name: "Example Agency" },
      sourceType: "html_lookup",
      sourceUrl: "https://example.gov/lookup",
      tradeCoverage: [],
      licenseTypesIncluded: [],
      knownExclusions: ["Local permits are outside this source."],
      hasBulkDownload: false,
      hasLiveLookup: true,
      requiresJavaScript: true,
      requiresCaptcha: true,
      requiresAccount: false,
      redistributionStatus: "unknown",
      adapterStatus: "blocked",
      sourceDiscoveryStatus: "blocked",
      adapterMaturity: "blocked",
      coverageScope: "state_agency_partial",
      sourceResearchOutcome: "blocked",
      researchReviewedAt: "2026-06-27T00:00:00.000Z",
      nextReviewAt: "2026-12-27T00:00:00.000Z",
      researchEvidence: [
        {
          url: "https://example.gov/lookup",
          checkedAt: "2026-06-27T00:00:00.000Z",
          note: "Official lookup requires CAPTCHA.",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
