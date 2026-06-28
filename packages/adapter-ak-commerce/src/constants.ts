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
    "The live search and download endpoints are protected by technical access controls that this project does not bypass.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: "unknown",
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: "Command-line access to the download path was observed to be protected by DataDome; do not bypass technical controls.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official lookup and download metadata only. Absence from this source is not proof that a license, endorsement, registration, or local authorization does not exist elsewhere.",
  adapterStatus: "blocked",
  sourceDiscoveryStatus: "blocked",
  adapterMaturity: "blocked",
  adapterQualityLevel: 0,
  coverageScope: "state_agency_partial",
  adapterPackage: null,
  testFixturePath: null,
  officialLookupUrl: "https://www.commerce.alaska.gov/cbp/main/Search/Professional",
  officialBulkDownloadNotes: "The Alaska site exposes professional license database-download paths, but live automated download is not implemented and command-line access was observed to be protected by DataDome.",
  researchNotes: "A historical hand-authored parser fixture does not establish compatibility with an official export. The source remains blocked while technical controls prevent lawful shape validation.",
  verificationReviewedAt: null,
  verificationCaveats: [
    "Alaska CBPL fixture support is based on a tiny hand-authored sample, not a live CBPL export.",
    "The professional licensing source spans many programs and does not represent business licenses, corporations, local permits, or non-CBPL authorizations.",
    "No matching record means no match in this source at the checked time, not proof that a license, endorsement, registration, or local authorization does not exist elsewhere.",
  ],
  verificationNotes: "No supported sync or verification adapter is exposed while official source access is blocked.",
  lastVerifiedAt: "2026-06-28T00:00:00.000Z",
  schemaVersion: "1.0",
  sourceResearchOutcome: "blocked",
  researchReviewedAt: "2026-06-28T00:00:00.000Z",
  nextReviewAt: "2026-12-28T00:00:00.000Z",
  researchEvidence: [
    {
      "url": "https://www.commerce.alaska.gov/cbp/main/Search/Professional",
      "checkedAt": "2026-06-28T00:00:00.000Z",
      "note": "Official lookup and download path reviewed; automated access was blocked by DataDome."
    }
  ],
  blocker: {
    code: "access_controls",
    summary: "Official search and download access is protected by technical controls, and no stable lawful file shape could be validated.",
    evidenceUrls: ["https://www.commerce.alaska.gov/cbp/main/Search/Professional"],
  },
  maintainerNotes: "Keep contractor program scope separate from Alaska business-license and corporation records. Do not automate protected endpoints.",
};
