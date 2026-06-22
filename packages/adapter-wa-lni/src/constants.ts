import type { SourceRegistryEntry } from "@opentrade/core";

export const WA_LNI_CONTRACTORS_SOURCE_ID = "us.wa.lni.contractors";
export const WA_LNI_CONTRACTORS_SOURCE_URL = "https://data.wa.gov/Labor/L-I-Contractor-License-Data-General/m8qx-ubtq";

export const WA_LNI_SOURCE_ENTRY: SourceRegistryEntry = {
  id: WA_LNI_CONTRACTORS_SOURCE_ID,
  name: "Washington L&I Contractor License Data",
  jurisdiction: {
    country: "US",
    state: "WA",
  },
  agency: {
    name: "Washington State Department of Labor & Industries",
    url: "https://www.lni.wa.gov/",
  },
  sourceType: "bulk_csv",
  sourceUrl: WA_LNI_CONTRACTORS_SOURCE_URL,
  documentationUrl: WA_LNI_CONTRACTORS_SOURCE_URL,
  dataDictionaryUrl: "https://data.wa.gov/api/views/m8qx-ubtq/columns.json",
  termsUrl: "https://data.wa.gov/stories/s/Open-Data-Policy/9n5e-k4ra/",
  updateFrequency: "The Data.WA listing says the contractor data is updated multiple times per day; verify current portal metadata before relying on freshness assumptions.",
  tradeCoverage: ["contractor registration"],
  licenseTypesIncluded: ["Washington L&I contractor license records"],
  knownExclusions: [
    "This source is focused on Washington L&I contractor licensing and does not represent every local permit, business registration, or trade authorization in Washington.",
    "Related workers compensation, bond, insurance, infraction, and lawsuit details may require separate official sources or fields that need additional review before normalization.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: false,
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: "Use local files by default. Any future live download should use the official open-data export responsibly and remain opt-in.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official open-data source metadata. Absence from this source is not proof that a license does not exist elsewhere.",
  adapterStatus: "implemented",
  sourceDiscoveryStatus: "researched",
  adapterMaturity: "fixture_adapter",
  adapterQualityLevel: 4,
  coverageScope: "statewide",
  adapterPackage: "@opentrade/adapter-wa-lni",
  testFixturePath: "packages/adapter-wa-lni/fixtures/contractor-license-sample.csv",
  officialLookupUrl: "https://secure.lni.wa.gov/verify/",
  officialBulkDownloadNotes: "The Data.WA portal exposes bulk exports and API metadata for this dataset. The adapter fixture is hand-authored from official column names and does not include copied bulk rows.",
  researchNotes: "Washington is the first five-state expansion adapter candidate because the official source is open-data-shaped and has a stable dataset identifier.",
  verificationReviewedAt: "2026-06-22T00:00:00.000Z",
  verificationCaveats: [
    "Verification is limited to the checked local fixture-shaped file and currently does not download Washington source data.",
    "L&I contractor data does not represent every local permit, business registration, or trade authorization in Washington.",
    "Bond, insurance, workers compensation, and enforcement-like fields need separate source-specific interpretation before being treated as final compliance facts.",
  ],
  verificationNotes: "Fixture verification uses neutral result states and keeps L&I coverage limits in source caveats.",
  lastVerifiedAt: "2026-06-21T00:00:00.000Z",
  maintainerNotes: "Keep bond, insurance, workers compensation, and disciplinary-like fields as raw or compliance placeholders until their source semantics are reviewed.",
};
