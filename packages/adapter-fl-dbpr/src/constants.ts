import type { SourceRegistryEntry } from "@opentrade/core";

export const FL_DBPR_CONSTRUCTION_SOURCE_ID = "us.fl.dbpr.construction";

export const FL_DBPR_CONSTRUCTION_SOURCE_URL =
  "https://www2.myfloridalicense.com/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv";

export const FL_DBPR_SOURCE_ENTRY: SourceRegistryEntry = {
  id: FL_DBPR_CONSTRUCTION_SOURCE_ID,
  name: "Florida DBPR Construction Industry Licenses",
  jurisdiction: {
    country: "US",
    state: "FL",
  },
  agency: {
    name: "Florida Department of Business and Professional Regulation",
    url: "https://www2.myfloridalicense.com/",
  },
  sourceType: "bulk_csv",
  sourceUrl: FL_DBPR_CONSTRUCTION_SOURCE_URL,
  documentationUrl: "https://www2.myfloridalicense.com/construction-industry/public-records/",
  dataDictionaryUrl: "https://www2.myfloridalicense.com/about-us/understanding-dbpr-codes/",
  termsUrl: "https://www2.myfloridalicense.com/privacy-statement/",
  updateFrequency: "unknown; verify against the official public-records page before relying on freshness assumptions",
  tradeCoverage: ["construction"],
  licenseTypesIncluded: ["construction industry licenses"],
  knownExclusions: [
    "Source coverage and exclusions must be verified against official documentation before generated datasets are redistributed.",
    "This source entry is limited to DBPR construction-industry records and does not represent every Florida trade, local license, complaint, or discipline source.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: "unknown",
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: "Use the official bulk file responsibly. Network sync is not enabled in v0.1, and automated downloads should be opt-in.",
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official public-record source for Florida DBPR construction-industry data. Absence from this source is not proof that a license does not exist elsewhere.",
  adapterStatus: "implemented",
  sourceDiscoveryStatus: "researched",
  adapterMaturity: "local_file_adapter",
  coverageScope: "state_agency_partial",
  adapterPackage: "@opentrade/adapter-fl-dbpr",
  testFixturePath: "packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv",
  officialLookupUrl: "https://www.myfloridalicense.com/wl11.asp",
  officialBulkDownloadNotes: "The v0.1 adapter reads local CSV files that match the official DBPR construction-license extract shape. Live download support is planned as opt-in network sync.",
  researchNotes: "Florida has multiple state and local licensing sources. This entry covers DBPR construction-industry records only.",
  lastVerifiedAt: "2026-06-19T00:00:00.000Z",
  maintainerNotes: "Use source URL, fetched time, caveats, raw record, and fingerprint in downstream exports.",
};

export const PRIMARY_STATUS_LABELS: Record<string, string> = {
  C: "Current",
  P: "Probation",
  S: "Suspended",
};

export const SECONDARY_STATUS_LABELS: Record<string, string> = {
  A: "Active",
  I: "Inactive",
};

export const OCCUPATION_LABELS: Record<string, string> = {
  CAC: "Certified Air Conditioning Contractor",
  CBC: "Certified Building Contractor",
  CCC: "Certified Roofing Contractor",
  CFC: "Certified Plumbing Contractor",
  CGC: "Certified General Contractor",
  CMC: "Certified Mechanical Contractor",
  CPC: "Certified Pool/Spa Contractor",
  CRC: "Certified Residential Contractor",
  CSC: "Certified Sheet Metal Contractor",
  CUC: "Certified Utility & Excavation Contractor",
  CVC: "Certified Solar Contractor",
  RA: "Registered Air Conditioning Contractor",
  RB: "Registered Building Contractor",
  RC: "Registered Roofing Contractor",
  RF: "Registered Plumbing Contractor",
  RG: "Registered General Contractor",
  RM: "Registered Mechanical Contractor",
  RP: "Registered Pool/Spa Contractor",
  RR: "Registered Residential Contractor",
  RS: "Registered Sheet Metal Contractor",
  RU: "Registered Underground Utility Excavator",
  RV: "Registered Solar Contractor",
  SCC: "Certified Specialty Contractor",
  RX: "Registered Specialty Contractor",
};

export const CLASS_LABELS: Record<string, string> = {
  "CAC:A": "Class A",
  "CAC:B": "Class B",
  "CAC:C": "Air Conditioning Service",
  "RA:A": "Class A",
  "RA:B": "Class B",
  "RA:C": "Air Conditioning Service",
  "CPC:A": "Commercial Pool/Spa Contractor",
  "CPC:B": "Residential Pool/Spa Contractor",
  "CPC:C": "Pool/Spa Contractor Service",
  "RP:A": "Commercial Pool/Spa Contractor",
  "RP:B": "Residential Pool/Spa Contractor",
  "RP:C": "Pool/Spa Contractor Service",
};
