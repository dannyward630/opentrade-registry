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
  termsUrl: null,
  updateFrequency: "unknown",
  tradeCoverage: ["construction"],
  licenseTypesIncluded: ["construction industry licenses"],
  knownExclusions: [
    "Source coverage and exclusions must be verified against official documentation before generated datasets are redistributed.",
  ],
  hasBulkDownload: true,
  hasLiveLookup: true,
  requiresJavaScript: "unknown",
  requiresCaptcha: "unknown",
  requiresAccount: false,
  rateLimitNotes: null,
  redistributionStatus: "unknown",
  publicRecordsNotes: "Official public-record source. Generated dataset redistribution is not assumed to be allowed.",
  adapterStatus: "implemented",
  adapterPackage: "@opentrade/adapter-fl-dbpr",
  testFixturePath: "packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv",
  lastVerifiedAt: null,
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

