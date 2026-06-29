import { z } from "zod";
import { canonicalTradeLicenseRecordV2Schema, type CanonicalTradeLicenseRecord } from "../schema/index.js";

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

export const verificationResultV2OutcomeSchema = z.enum([
  "indexed_match",
  "live_match",
  "not_found",
  "manual_required",
  "pending",
  "ambiguous",
  "stale",
  "source_unavailable",
]);

export const tradeLicenseVerificationResultV2Schema = z.object({
  schemaVersion: z.literal("2.0"),
  sourceId: z.string().min(1),
  query: z.object({
    licenseNumber: z.string().min(1).optional(),
    businessName: z.string().min(1).optional(),
    ownerFirstName: z.string().min(1).optional(),
    ownerLastName: z.string().min(1).optional(),
  }),
  result: verificationResultV2OutcomeSchema,
  matchedRecord: canonicalTradeLicenseRecordV2Schema.optional(),
  candidateRecords: z.array(canonicalTradeLicenseRecordV2Schema).optional(),
  warnings: z.array(z.object({ code: z.string().min(1), message: z.string().min(1) })),
  reasons: z.array(z.object({ code: z.string().min(1), message: z.string().min(1) })),
  checkedAt: z.string().datetime(),
  sourceFreshness: z.object({
    observedAt: z.string().datetime(),
    staleAt: z.string().datetime().optional(),
  }).optional(),
  manualHandoff: z.object({
    url: z.string().url(),
    instructions: z.array(z.string().min(1)).min(1),
  }).optional(),
  jobId: z.string().min(1).optional(),
});

export type VerificationResultV2Outcome = z.infer<typeof verificationResultV2OutcomeSchema>;
export type TradeLicenseVerificationResultV2 = z.infer<typeof tradeLicenseVerificationResultV2Schema>;
