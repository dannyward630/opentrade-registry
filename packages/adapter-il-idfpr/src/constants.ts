import type { SourceRegistryEntry } from "@opentrade/core";

export const IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID = "us.il.idfpr.roofing_contractors";
export const IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_URL = "https://idfpr.illinois.gov/checklicense.html";

export const IL_IDFPR_SOURCE_ENTRY: SourceRegistryEntry = {
  id: IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID,
  name: "Illinois IDFPR Roofing Contractor License Lookup",
  jurisdiction: {
    country: "US",
    state: "IL",
  },
  agency: {
    name: "Illinois Department of Financial and Professional Regulation",
    url: "https://idfpr.illinois.gov/",
  },
  sourceType: "html_lookup",
  sourceUrl: IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_URL,
  documentationUrl: "https://idfpr.illinois.gov/profs/roof.html",
  dataDictionaryUrl: null,
  termsUrl: "https://www.illinois.gov/about/policies.html",
  updateFrequency: "IDFPR describes the license lookup as primary-source verification and notes daily single-license lookup and weekly bulk lookup updates unless otherwise noted; verify current page text before relying on freshness assumptions.",
  tradeCoverage: ["roofing"],
  licenseTypesIncluded: ["Illinois roofing contractor license records exposed by IDFPR lookup paths"],
  knownExclusions: [
    "This source entry is scoped to IDFPR roofing contractor licenses and does not represent every Illinois construction, trade, local permit, or business registration source.",
    "No stable downloadable file shape has been validated for the IDFPR bulk lookup path.",
    "Discipline, enforcement, complaints, local authorizations, and non-IDFPR records may require separate official sources.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: "unknown",
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: "Do not automate the live lookup or bulk lookup path unless source terms, controls, and fields are reviewed.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official lookup metadata only. Absence from this source is not proof that a license, local authorization, or other credential does not exist elsewhere.",
  adapterStatus: "blocked",
  sourceDiscoveryStatus: "blocked",
  adapterMaturity: "blocked",
  adapterQualityLevel: 0,
  coverageScope: "state_agency_partial",
  adapterPackage: null,
  testFixturePath: null,
  officialLookupUrl: "https://online-dfpr.micropact.com/Lookup/LicenseLookup.aspx",
  officialBulkDownloadNotes: "IDFPR documents bulk lookup update timing, but no stable public downloadable file shape was validated during the v1 review.",
  researchNotes: "A historical hand-authored parser fixture does not establish compatibility with an official export or lookup response.",
  verificationReviewedAt: null,
  verificationCaveats: [
    "Illinois IDFPR fixture support is based on a tiny hand-authored sample, not a live IDFPR export or lookup response.",
    "This adapter is scoped to IDFPR roofing contractor records and does not represent every Illinois construction, trade, local permit, or business registration source.",
    "No matching record means no match in this source at the checked time, not proof that a license, local authorization, or other credential does not exist elsewhere.",
  ],
  verificationNotes: "No supported sync or verification adapter is exposed until a stable official source shape and access path are documented.",
  lastVerifiedAt: "2026-06-28T00:00:00.000Z",
  schemaVersion: "1.0",
  sourceResearchOutcome: "blocked",
  researchReviewedAt: "2026-06-28T00:00:00.000Z",
  nextReviewAt: "2026-12-28T00:00:00.000Z",
  researchEvidence: [
    {
      "url": "https://online-dfpr.micropact.com/Lookup/LicenseLookup.aspx",
      "checkedAt": "2026-06-28T00:00:00.000Z",
      "note": "Official lookup documentation reviewed; no stable public file shape was available for validation."
    }
  ],
  blocker: {
    code: "no_stable_source",
    summary: "The official lookup is available, but no stable public downloadable source shape has been validated for offline adapter support.",
    evidenceUrls: ["https://idfpr.illinois.gov/checklicense.html", "https://online-dfpr.micropact.com/Lookup/LicenseLookup.aspx"],
  },
  maintainerNotes: "Keep IDFPR roofing scope explicit. Do not automate lookup or bulk lookup paths until access controls, terms, and field shape have been reviewed.",
};
