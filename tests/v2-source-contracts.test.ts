import { describe, expect, it } from "vitest";
import { sourceRegistryEntryV2Schema } from "@opentrade-registry/core";

describe("v2 source contracts", () => {
  it("requires operational and access policies", () => {
    const result = sourceRegistryEntryV2Schema.safeParse({
      schemaVersion: "2.0",
      id: "us.fl.example.contractors",
      name: "Example Contractor Licenses",
      jurisdiction: { country: "US", state: "FL" },
      agency: { name: "Example Agency" },
      sourceType: "bulk_csv",
      sourceUrl: "https://data.example.gov/licenses.csv",
      tradeCoverage: ["general contracting"],
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
      adapterMaturity: "production_ready",
      adapterQualityLevel: 4,
      coverageScope: "statewide",
      sourceResearchOutcome: "production_ready",
      researchReviewedAt: "2026-06-29T00:00:00.000Z",
      nextReviewAt: "2026-12-29T00:00:00.000Z",
      researchEvidence: [{
        url: "https://data.example.gov/licenses.csv",
        checkedAt: "2026-06-29T00:00:00.000Z",
        note: "Official bulk file reviewed.",
      }],
      automationMode: "bulk",
      allowedSourceHosts: ["data.example.gov"],
      accessControls: {
        javascript: false,
        captcha: false,
        account: false,
        paywall: false,
        antiBot: "not_observed",
      },
      publicationPolicy: {
        records: "review_required",
        rawRecords: "withheld",
        reviewedAt: "2026-06-29T00:00:00.000Z",
      },
      privacyPolicy: {
        sensitivity: "personal_contact_possible",
        minimizePersonalData: true,
        homeAddressHandling: "withhold_pending_review",
      },
      retentionPolicy: { snapshots: "indefinite", records: "indefinite" },
      synchronizationPolicy: {
        mode: "scheduled_opt_in",
        expectedCadence: "monthly",
        requiresExplicitNetworkPermission: true,
      },
      freshnessPolicy: { staleAfterDays: 45, unavailableAfterDays: 120 },
      healthPolicy: { minimumRecordCount: 1, maximumCountDeltaRatio: 0.5 },
    });
    expect(result.success).toBe(true);
  });
});
