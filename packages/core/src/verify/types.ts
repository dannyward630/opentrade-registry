import type { CanonicalTradeLicenseRecord } from "../schema/index.js";

export type VerificationWarning = {
  code: string;
  message: string;
  rowNumber?: number;
  recordFingerprint?: string;
};

export type VerificationReason = {
  code: string;
  message: string;
};

export type TradeLicenseVerificationResult = {
  sourceId: string;
  jurisdiction: string;
  query: {
    licenseNumber?: string;
    businessName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
  };
  result:
    | "not_applicable"
    | "missing_required_input"
    | "not_found"
    | "ambiguous"
    | "matched"
    | "matched_with_warnings"
    | "not_current"
    | "expired"
    | "identity_mismatch"
    | "source_unavailable";
  matchedRecord?: CanonicalTradeLicenseRecord;
  candidateRecords?: CanonicalTradeLicenseRecord[];
  warnings: VerificationWarning[];
  reasons: VerificationReason[];
  checkedAt: string;
};
