import type { SourceRegistryEntry } from "@opentrade/core";

export const TX_TDLR_ALL_LICENSES_SOURCE_ID = "us.tx.tdlr.all_licenses";
export const TX_TDLR_ALL_LICENSES_SOURCE_URL = "https://data.texas.gov/dataset/TDLR-All-Licenses/7358-krk7";

export const TX_TDLR_SOURCE_ENTRY: SourceRegistryEntry = {
  id: TX_TDLR_ALL_LICENSES_SOURCE_ID,
  name: "Texas TDLR All Licenses",
  jurisdiction: {
    country: "US",
    state: "TX",
  },
  agency: {
    name: "Texas Department of Licensing and Regulation",
    url: "https://www.tdlr.texas.gov/",
  },
  sourceType: "bulk_csv",
  sourceUrl: TX_TDLR_ALL_LICENSES_SOURCE_URL,
  documentationUrl: TX_TDLR_ALL_LICENSES_SOURCE_URL,
  dataDictionaryUrl: "https://data.texas.gov/api/views/7358-krk7/columns.json",
  termsUrl: "https://data.texas.gov/stories/s/9e82-j4cb",
  updateFrequency: "unknown; verify on the Texas Open Data Portal before relying on freshness assumptions",
  tradeCoverage: ["multiple regulated trades"],
  licenseTypesIncluded: ["TDLR license holders"],
  knownExclusions: [
    "The dataset spans many TDLR license types and is not limited to construction or skilled-trade licenses.",
    "Texas licensing is split across state and local authorities; this source does not represent every Texas contractor or trade authorization.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: "unknown",
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: "No live adapter download is implemented yet. Use local files or explicit network sync only when appropriate.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official open-data source metadata. Absence from this source is not proof that a license does not exist elsewhere.",
  adapterStatus: "implemented",
  sourceDiscoveryStatus: "researched",
  adapterMaturity: "fixture_adapter",
  coverageScope: "state_agency_partial",
  adapterPackage: "@opentrade/adapter-tx-tdlr",
  testFixturePath: "packages/adapter-tx-tdlr/fixtures/all-licenses-sample.csv",
  officialLookupUrl: "https://www.tdlr.texas.gov/verify.htm",
  officialBulkDownloadNotes: "The fixture adapter uses the official open-data column shape but does not include live Texas Open Data rows.",
  researchNotes: "Filter and categorize license types carefully because this source spans many TDLR programs.",
  lastVerifiedAt: "2026-06-21T00:00:00.000Z",
  maintainerNotes: "Do not treat all TDLR rows as contractor records without license-type filtering.",
};
