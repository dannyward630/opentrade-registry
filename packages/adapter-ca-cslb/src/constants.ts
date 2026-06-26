import type { SourceRegistryEntry } from "@opentrade/core";

export const CA_CSLB_CONTRACTORS_SOURCE_ID = "us.ca.cslb.contractors";
export const CA_CSLB_CONTRACTORS_SOURCE_URL = "https://www.cslb.ca.gov/onlineservices/dataportal/";

export const CA_CSLB_SOURCE_ENTRY: SourceRegistryEntry = {
  id: CA_CSLB_CONTRACTORS_SOURCE_ID,
  name: "California CSLB Master List of Licensed Contractors",
  jurisdiction: {
    country: "US",
    state: "CA",
  },
  agency: {
    name: "Contractors State License Board",
    url: "https://www.cslb.ca.gov/",
  },
  sourceType: "bulk_xlsx",
  sourceUrl: CA_CSLB_CONTRACTORS_SOURCE_URL,
  documentationUrl: "https://www.cslb.ca.gov/onlineservices/dataportal/",
  dataDictionaryUrl: null,
  termsUrl: "https://www.cslb.ca.gov/About_Us/Privacy_Policy.aspx",
  updateFrequency: "unknown; verify against the official data portal before relying on freshness assumptions",
  tradeCoverage: ["construction"],
  licenseTypesIncluded: ["contractor licenses"],
  knownExclusions: [
    "Exact source coverage, file contents, and exclusions must be confirmed against official CSLB documentation before local-file or network implementation.",
    "This adapter does not model companion files such as personnel, bond, or workers' compensation data.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: "unknown",
  requiresCaptcha: "unknown",
  requiresAccount: "unknown",
  rateLimitNotes: "Fixture adapter only. Any future download support should be opt-in and should respect official data portal guidance.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Fixture adapter only. Generated dataset redistribution is not assumed to be allowed.",
  adapterStatus: "implemented",
  sourceDiscoveryStatus: "researched",
  adapterMaturity: "fixture_adapter",
  coverageScope: "statewide",
  adapterPackage: "@opentrade/adapter-ca-cslb",
  testFixturePath: "packages/adapter-ca-cslb/fixtures/contractors-master-sample.csv",
  officialLookupUrl: "https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx",
  officialBulkDownloadNotes: "CSLB describes downloadable master-list data and companion files on its public data portal. This adapter currently uses only a tiny fixture and does not download or parse the live files.",
  researchNotes: "Fixture support exists for license-master-like rows. Future work should review the current live file shape, companion files, and redistribution posture in detail.",
  lastVerifiedAt: "2026-06-26T00:00:00.000Z",
  maintainerNotes: "Keep the fixture adapter scoped to license-master concepts; do not infer companion-file compliance facts.",
  adapterQualityLevel: 4,
  verificationReviewedAt: "2026-06-26T00:00:00.000Z",
  verificationCaveats: [
    "California CSLB fixture support is based on a tiny hand-authored sample, not the live CSLB master list.",
    "CSLB companion files and instant license lookup may contain source details that are not represented by this fixture.",
    "No matching record means no match in this source at the checked time, not proof that a license does not exist elsewhere.",
  ],
  verificationNotes: "Fixture verification supports matched, not-found, ambiguous duplicate, and invalid-input outcomes through the shared CLI verifier. Rows are normalized conservatively and preserve CSLB source caveats.",
};

