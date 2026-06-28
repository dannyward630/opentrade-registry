import type { SourceRegistryEntry } from "@opentrade-registry/core";

export const MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID = "us.mn.dli.licenses_registrations";
export const MN_DLI_LICENSES_REGISTRATIONS_SOURCE_URL = "https://secure.doli.state.mn.us/ccld/data/MNDLILicRegCertExport.zip";

export const MN_DLI_SOURCE_ENTRY: SourceRegistryEntry = {
  id: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
  name: "Minnesota DLI License and Registration Data",
  jurisdiction: {
    country: "US",
    state: "MN",
  },
  agency: {
    name: "Minnesota Department of Labor and Industry",
    url: "https://www.dli.mn.gov/",
  },
  sourceType: "bulk_csv",
  sourceUrl: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_URL,
  documentationUrl: "https://www.dli.mn.gov/license-and-registration-lookup",
  dataDictionaryUrl: null,
  termsUrl: "https://mn.gov/portal/policies/",
  updateFrequency: "The official page states the export file is updated nightly; verify current source text before relying on freshness assumptions.",
  tradeCoverage: ["construction codes and licensing"],
  licenseTypesIncluded: ["Licenses, bonds, certifications, and registrations issued by the Construction Codes and Licensing Division of DLI"],
  knownExclusions: [
    "The export may include many license, bond, certification, and registration types beyond contractor licenses.",
    "Local permits, business registrations, and sources outside DLI Construction Codes and Licensing are not represented by this source entry.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: false,
  requiresCaptcha: false,
  requiresAccount: false,
  rateLimitNotes: "The official page links a nightly ZIP archive. Network download and archive extraction are not implemented; obtain and extract it locally.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "The local-file adapter is validated against the official nightly CSV columns. Absence from this source is not proof that a license does not exist elsewhere.",
  adapterStatus: "implemented",
  sourceDiscoveryStatus: "researched",
  adapterMaturity: "local_file_adapter",
  coverageScope: "state_agency_partial",
  adapterPackage: "@opentrade-registry/adapter-mn-dli",
  testFixturePath: "packages/adapter-mn-dli/fixtures/licenses-registrations-sample.csv",
  officialLookupUrl: "https://www.dli.mn.gov/license-and-registration-lookup",
  officialBulkDownloadNotes:
    "The official DLI page links a nightly ZIP containing a CSV export. The adapter accepts the extracted local CSV/XLSX shape but does not download or extract the archive.",
  researchNotes: "The nightly CSV header and representative rows were checked against the official archive. The export spans licenses, bonds, certifications, and registrations, so trade mapping remains conservative.",
  lastVerifiedAt: "2026-06-28T00:00:00.000Z",
  schemaVersion: "1.0",
  sourceResearchOutcome: "local_file_adapter",
  researchReviewedAt: "2026-06-28T00:00:00.000Z",
  nextReviewAt: "2026-12-28T00:00:00.000Z",
  researchEvidence: [
    {
      "url": "https://www.dli.mn.gov/license-and-registration-lookup",
      "checkedAt": "2026-06-28T00:00:00.000Z",
      "note": "Official page, nightly ZIP link, CSV header, and representative row shape reviewed."
    }
  ],
  maintainerNotes: "Do not treat every DLI export row as a contractor license without type filtering.",
  adapterQualityLevel: 4,
  verificationReviewedAt: "2026-06-28T00:00:00.000Z",
  verificationCaveats: [
    "Minnesota DLI mapping is validated against the official nightly export columns; fixture rows remain hand-authored.",
    "The DLI source can include many license, bond, certification, and registration types beyond contractor licenses.",
    "No matching record means no match in this source at the checked time, not proof that a license does not exist elsewhere.",
  ],
  verificationNotes:
    "Local extracted-file verification supports matched, not-found, ambiguous duplicate, and invalid-input outcomes. Rows are normalized conservatively because the official DLI export includes multiple record types beyond contractor licenses.",
};
