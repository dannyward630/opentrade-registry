import type { SourceRegistryEntry } from "@opentrade/core";

export const AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID = "us.ak.commerce.construction_contractors";
export const AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_URL = "https://www.commerce.alaska.gov/cbp/main/Search/Professional";

export const AK_COMMERCE_SOURCE_ENTRY: SourceRegistryEntry = {
  id: AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID,
  name: "Alaska CBPL Construction Contractor License Search",
  jurisdiction: {
    country: "US",
    state: "AK",
  },
  agency: {
    name: "Alaska Division of Corporations, Business and Professional Licensing",
    url: "https://www.commerce.alaska.gov/web/cbpl/",
  },
  sourceType: "html_lookup",
  sourceUrl: AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_URL,
  documentationUrl: "https://www.commerce.alaska.gov/web/cbpl/ProfessionalLicensing/ConstructionContractors",
  dataDictionaryUrl: null,
  termsUrl: "https://www.commerce.alaska.gov/web/cbpl/LicenseVerification",
  updateFrequency: "unknown; verify against the Alaska professional license search and download information before relying on freshness assumptions",
  tradeCoverage: ["general_contracting", "residential_contracting", "roofing", "other"],
  licenseTypesIncluded: ["construction contractor professional license records exposed by Alaska CBPL search and download paths"],
  knownExclusions: [
    "The Alaska professional licensing search spans many programs; this source entry is scoped to construction contractor records and related contractor endorsements only.",
    "Business licenses, corporations, local permits, and non-CBPL authorizations are outside this source entry.",
    "Disciplinary action history may require separate official reports or public records requests.",
    "The fixture adapter does not access the live protected search or download endpoints.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: "unknown",
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: "Fixture adapter only. Command-line access to the download path was observed to be protected by DataDome; do not bypass technical controls.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official lookup and download metadata only. Absence from this source is not proof that a license, endorsement, registration, or local authorization does not exist elsewhere.",
  adapterStatus: "implemented",
  sourceDiscoveryStatus: "researched",
  adapterMaturity: "local_file_adapter",
  adapterQualityLevel: 4,
  coverageScope: "state_agency_partial",
  adapterPackage: "@opentrade/adapter-ak-commerce",
  testFixturePath: "packages/adapter-ak-commerce/fixtures/construction-contractors-sample.csv",
  officialLookupUrl: "https://www.commerce.alaska.gov/cbp/main/Search/Professional",
  officialBulkDownloadNotes: "The Alaska site exposes professional license database-download paths, but live automated download is not implemented and command-line access was observed to be protected by DataDome.",
  researchNotes: "Fixture support exists for a tiny hand-authored construction-contractor-shaped CSV. Future work should verify the official download field layout manually before any local-file or opt-in-network promotion.",
  verificationReviewedAt: "2026-06-26T00:00:00.000Z",
  verificationCaveats: [
    "Alaska CBPL fixture support is based on a tiny hand-authored sample, not a live CBPL export.",
    "The professional licensing source spans many programs and does not represent business licenses, corporations, local permits, or non-CBPL authorizations.",
    "No matching record means no match in this source at the checked time, not proof that a license, endorsement, registration, or local authorization does not exist elsewhere.",
  ],
  verificationNotes: "Fixture verification supports matched, not-found, ambiguous duplicate, and invalid-input outcomes while preserving Alaska CBPL source caveats.",
  lastVerifiedAt: "2026-06-27T00:00:00.000Z",
  schemaVersion: "1.0",
  sourceResearchOutcome: "local_file_adapter",
  researchReviewedAt: "2026-06-27T00:00:00.000Z",
  nextReviewAt: "2026-12-27T00:00:00.000Z",
  researchEvidence: [
    {
      "url": "https://www.commerce.alaska.gov/cbp/main/Search/Professional",
      "checkedAt": "2026-06-27T00:00:00.000Z",
      "note": "Official source documentation and supported local-file shape reviewed."
    }
  ],
  maintainerNotes: "Keep contractor program scope separate from Alaska business-license and corporation records. Do not automate protected endpoints.",
};
