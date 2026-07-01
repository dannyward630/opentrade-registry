import { z } from "zod";
import { OPENTRADE_V2_API_VERSION } from "../contracts/version.js";
import { recordSensitivityLevelSchema, tradeCategorySchema } from "../schema/canonical-license.js";
import { boardAccessPathSchema } from "../schema/board-inventory.js";

export const OPENTRADE_V2_ROUTES = Object.freeze({
  sources: "/api/v2/sources",
  licenseSearch: "/api/v2/licenses/search",
  licenseById: "/api/v2/licenses/:id",
  verifications: "/api/v2/verifications",
  verificationById: "/api/v2/verifications/:jobId",
  developerKeys: "/api/v2/developer/keys",
  developerKeyById: "/api/v2/developer/keys/:id",
} as const);

const apiVersionSchema = z.literal(OPENTRADE_V2_API_VERSION);

export const recordApiStoredLicenseRecordV2Schema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  sourceSnapshotId: z.string().min(1),
  recordVersion: z.string().min(1),
  jurisdictionState: z.string().length(2),
  licenseNumber: z.string().min(1),
  licenseNumberNormalized: z.string().min(1),
  businessName: z.string().nullable(),
  licenseeName: z.string().nullable(),
  normalizedStatus: z.string().min(1),
  tradeCategories: z.array(tradeCategorySchema),
  observedAt: z.string().datetime(),
  publicationDisposition: z.literal("allowed"),
  sensitivityLevel: recordSensitivityLevelSchema,
  sourceUrl: z.string().url(),
  caveats: z.array(z.string()),
  canonicalRecord: z.unknown(),
});

export const recordApiPublicSourceV2Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceUrl: z.string().url(),
  officialLookupUrl: z.string().url().nullable().optional(),
  verificationCaveats: z.array(z.string().min(1)).optional(),
  accessPath: boardAccessPathSchema,
});

export const recordApiSourceListResponseV2Schema = z.object({
  apiVersion: apiVersionSchema,
  count: z.number().int().nonnegative(),
  completeness: z.enum(["representative_source_baseline", "board_complete"]),
  sources: z.array(recordApiPublicSourceV2Schema),
});

export const recordApiSearchResponseV2Schema = z.object({
  apiVersion: apiVersionSchema,
  records: z.array(recordApiStoredLicenseRecordV2Schema),
  nextCursor: z.string().nullable(),
});

export const recordApiLicenseResponseV2Schema = z.object({
  apiVersion: apiVersionSchema,
  record: recordApiStoredLicenseRecordV2Schema,
});

const checkedResponseSchema = z.object({
  apiVersion: apiVersionSchema,
  checkedAt: z.string().datetime(),
});

export const recordApiVerificationResponseV2Schema = z.discriminatedUnion("result", [
  checkedResponseSchema.extend({ result: z.literal("indexed_match"), record: recordApiStoredLicenseRecordV2Schema }),
  checkedResponseSchema.extend({ result: z.literal("live_match"), record: recordApiStoredLicenseRecordV2Schema }),
  checkedResponseSchema.extend({ result: z.literal("ambiguous"), records: z.array(recordApiStoredLicenseRecordV2Schema).min(2) }),
  checkedResponseSchema.extend({ result: z.literal("pending"), jobId: z.string().min(1) }),
  checkedResponseSchema.extend({
    result: z.literal("manual_required"),
    manualHandoff: z.object({ url: z.string().url(), instructions: z.array(z.string().min(1)).min(1) }),
  }),
  checkedResponseSchema.extend({ result: z.literal("not_found"), reasons: z.array(z.string().min(1)).min(1), caveats: z.array(z.string()) }),
  checkedResponseSchema.extend({ result: z.literal("stale"), reasons: z.array(z.string().min(1)).min(1), record: recordApiStoredLicenseRecordV2Schema.optional() }),
  checkedResponseSchema.extend({ result: z.literal("source_unavailable"), reasons: z.array(z.string().min(1)).min(1) }),
]);

export const recordApiVerificationJobV2Schema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]),
  result: z.unknown().optional(),
});

export const recordApiVerificationJobResponseV2Schema = z.object({
  apiVersion: apiVersionSchema,
  job: recordApiVerificationJobV2Schema,
});

export const recordApiDeveloperKeyMetadataV2Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  keyPrefix: z.string().min(1),
  quotaPerDay: z.number().int().positive(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  revokedAt: z.string().datetime().nullable().optional(),
});

export const recordApiDeveloperKeyListResponseV2Schema = z.object({
  apiVersion: apiVersionSchema,
  keys: z.array(recordApiDeveloperKeyMetadataV2Schema),
});

export const recordApiDeveloperKeyCreatedResponseV2Schema = z.object({
  apiVersion: apiVersionSchema,
  key: recordApiDeveloperKeyMetadataV2Schema,
  rawKey: z.string().min(1),
});

export const recordApiErrorResponseV2Schema = z.object({
  apiVersion: apiVersionSchema,
  error: z.object({ code: z.string().min(1), message: z.string().min(1) }),
});

export type RecordApiStoredLicenseRecordV2 = z.infer<typeof recordApiStoredLicenseRecordV2Schema>;
export type RecordApiSearchResponseV2 = z.infer<typeof recordApiSearchResponseV2Schema>;
export type RecordApiVerificationResponseV2 = z.infer<typeof recordApiVerificationResponseV2Schema>;
