import { z } from "zod";

export const tradeCategorySchema = z.enum([
  "general_contracting",
  "residential_contracting",
  "commercial_contracting",
  "roofing",
  "hvac",
  "plumbing",
  "electrical",
  "mechanical",
  "solar",
  "pool_spa",
  "underground_utility",
  "sheet_metal",
  "home_improvement",
  "handyman",
  "asbestos",
  "other",
  "unknown",
]);

export const normalizedLicenseStatusSchema = z.enum([
  "active",
  "inactive",
  "expired",
  "suspended",
  "revoked",
  "probation",
  "pending",
  "unknown",
]);

export const sourceTypeSchema = z.enum([
  "bulk_csv",
  "bulk_xlsx",
  "bulk_json",
  "api",
  "html_lookup",
  "playwright_portal",
  "manual_public_records_file",
]);

export const sourceRedistributionStatusSchema = z.enum(["allowed", "restricted", "unknown"]);

export const licensePersonSchema = z.object({
  name: z.string().min(1),
  role: z.enum([
    "owner",
    "qualifier",
    "responsible_managing_officer",
    "financial_responsible_officer",
    "salesperson",
    "partner",
    "officer",
    "unknown",
  ]),
  licenseNumber: z.string().min(1).nullable().optional(),
  raw: z.unknown().optional(),
});

export const licenseAddressSchema = z.object({
  type: z.enum(["mailing", "physical", "business", "public_record", "unknown"]),
  line1: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  line3: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  raw: z.unknown().optional(),
});

export const canonicalTradeLicenseRecordSchema = z.object({
  schemaVersion: z.literal("1.0").optional(),
  id: z.string().min(1).optional(),
  sourceId: z.string().min(1),
  jurisdiction: z.object({
    country: z.literal("US"),
    state: z.string().length(2),
    county: z.string().nullable().optional(),
    municipality: z.string().nullable().optional(),
  }),
  agency: z.object({
    name: z.string().min(1),
    url: z.string().url().nullable().optional(),
  }),
  source: z.object({
    sourceUrl: z.string().url(),
    sourceRecordUrl: z.string().url().nullable().optional(),
    sourceType: sourceTypeSchema,
    fetchedAt: z.string().datetime(),
    sourceLastModifiedAt: z.string().datetime().nullable().optional(),
    importRunId: z.string().nullable().optional(),
    redistributionStatus: sourceRedistributionStatusSchema.optional(),
    caveats: z.array(z.string().min(1)).optional(),
  }),
  license: z.object({
    licenseNumber: z.string().min(1),
    licenseNumberNormalized: z.string().min(1),
    alternateLicenseNumbers: z.array(z.string().min(1)).optional(),
    typeCode: z.string().nullable().optional(),
    typeLabel: z.string().nullable().optional(),
    classificationCodes: z.array(z.string().min(1)).optional(),
    classificationLabels: z.array(z.string().min(1)).optional(),
    tradeCategories: z.array(tradeCategorySchema).optional(),
  }),
  identity: z.object({
    businessName: z.string().nullable().optional(),
    dbaName: z.string().nullable().optional(),
    licenseeName: z.string().nullable().optional(),
    personnel: z.array(licensePersonSchema).optional(),
  }),
  status: z.object({
    rawStatusCode: z.string().nullable().optional(),
    rawStatusLabel: z.string().nullable().optional(),
    secondaryRawStatusCode: z.string().nullable().optional(),
    secondaryRawStatusLabel: z.string().nullable().optional(),
    normalized: normalizedLicenseStatusSchema,
    isCurrent: z.boolean().nullable().optional(),
  }),
  dates: z.object({
    issueDate: z.string().datetime().nullable().optional(),
    originalLicensureDate: z.string().datetime().nullable().optional(),
    effectiveDate: z.string().datetime().nullable().optional(),
    expirationDate: z.string().datetime().nullable().optional(),
    renewalPeriod: z.string().nullable().optional(),
  }),
  contact: z.object({
    addresses: z.array(licenseAddressSchema).optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    website: z.string().url().nullable().optional(),
  }),
  compliance: z
    .object({
      bond: z.unknown().optional(),
      insurance: z.unknown().optional(),
      workersComp: z.unknown().optional(),
      complaints: z.unknown().optional(),
      discipline: z.unknown().optional(),
    })
    .optional(),
  raw: z.object({
    record: z.unknown(),
    fingerprint: z.string().min(1),
  }),
});

export const recordPublicationDispositionSchema = z.enum([
  "allowed",
  "review_required",
  "restricted",
  "withheld",
]);

export const recordSensitivityLevelSchema = z.enum([
  "business_only",
  "personal_contact",
  "sensitive_personal_data",
  "unknown",
]);

export const canonicalTradeLicenseRecordV2Schema = canonicalTradeLicenseRecordSchema.extend({
  schemaVersion: z.literal("2.0"),
  id: z.string().min(1),
  recordVersion: z.string().min(1),
  sourceSnapshotId: z.string().min(1),
  observedAt: z.string().datetime(),
  publication: z.object({
    disposition: recordPublicationDispositionSchema,
    rawRecordDisposition: recordPublicationDispositionSchema,
    reviewedAt: z.string().datetime(),
    notes: z.array(z.string().min(1)).optional(),
  }),
  sensitivity: z.object({
    level: recordSensitivityLevelSchema,
    containsHomeAddress: z.union([z.boolean(), z.literal("unknown")]),
    containsPersonalEmail: z.union([z.boolean(), z.literal("unknown")]),
    containsPersonalPhone: z.union([z.boolean(), z.literal("unknown")]),
    redactedFields: z.array(z.string().min(1)).optional(),
  }),
});

export type TradeCategory = z.infer<typeof tradeCategorySchema>;
export type NormalizedLicenseStatus = z.infer<typeof normalizedLicenseStatusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceRedistributionStatus = z.infer<typeof sourceRedistributionStatusSchema>;
export type LicensePerson = z.infer<typeof licensePersonSchema>;
export type LicenseAddress = z.infer<typeof licenseAddressSchema>;
export type CanonicalTradeLicenseRecord = z.infer<typeof canonicalTradeLicenseRecordSchema>;
export type RecordPublicationDisposition = z.infer<typeof recordPublicationDispositionSchema>;
export type RecordSensitivityLevel = z.infer<typeof recordSensitivityLevelSchema>;
export type CanonicalTradeLicenseRecordV2 = z.infer<typeof canonicalTradeLicenseRecordV2Schema>;
