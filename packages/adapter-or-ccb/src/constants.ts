import type { SourceRegistryEntry } from "@opentrade/core";

export const OR_CCB_ACTIVE_LICENSES_SOURCE_ID = "us.or.ccb.active_licenses";
export const OR_CCB_ACTIVE_LICENSES_SOURCE_URL = "https://data.oregon.gov/Business/CCB-Active-Licenses/g77e-6bhs";

export const OR_CCB_SOURCE_ENTRY: SourceRegistryEntry = {
  id: OR_CCB_ACTIVE_LICENSES_SOURCE_ID,
  name: "Oregon CCB Active Licenses",
  jurisdiction: {
    country: "US",
    state: "OR",
  },
  agency: {
    name: "Oregon Construction Contractors Board",
    url: "https://www.oregon.gov/ccb/",
  },
  sourceType: "bulk_csv",
  sourceUrl: OR_CCB_ACTIVE_LICENSES_SOURCE_URL,
  documentationUrl: OR_CCB_ACTIVE_LICENSES_SOURCE_URL,
  dataDictionaryUrl: "https://data.oregon.gov/api/views/g77e-6bhs/columns.json",
  termsUrl: "https://data.oregon.gov/stories/s/9w6a-76m7",
  updateFrequency: "unknown; verify current Oregon Open Data portal metadata before relying on freshness assumptions",
  tradeCoverage: ["construction"],
  licenseTypesIncluded: ["active Oregon CCB licenses"],
  knownExclusions: [
    "The source name indicates active licenses; inactive, expired, suspended, historical, local, or other agency records may be excluded.",
    "Electrical, plumbing, landscape, asbestos, and other specialized records can be regulated by separate Oregon agencies.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: false,
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: "No adapter live download is implemented. Prefer downloaded local files and official portal export mechanisms for future work.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official open-data source metadata. Absence from this active-license source is not proof that a license does not exist elsewhere.",
  adapterStatus: "implemented",
  sourceDiscoveryStatus: "researched",
  adapterMaturity: "fixture_adapter",
  coverageScope: "state_agency_partial",
  adapterPackage: "@opentrade/adapter-or-ccb",
  testFixturePath: "packages/adapter-or-ccb/fixtures/active-licenses-sample.csv",
  officialLookupUrl: "https://search.ccb.state.or.us/search/",
  officialBulkDownloadNotes: "Oregon Open Data exposes the active-license dataset and export metadata. The fixture adapter uses a tiny hand-authored sample with official column names.",
  researchNotes: "Fixture adapter support exists, but active-only coverage must be represented clearly in verification language.",
  lastVerifiedAt: "2026-06-21T00:00:00.000Z",
  maintainerNotes: "Do not present this source as complete statewide contractor licensing coverage.",
};
