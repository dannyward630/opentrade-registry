import { z } from "zod";
import { sourceRedistributionStatusSchema, sourceTypeSchema } from "./canonical-license.js";

const unknownableBooleanSchema = z.union([z.boolean(), z.literal("unknown")]);

export const sourceDiscoveryStatusSchema = z.enum(["needs_research", "researched", "blocked", "deprecated"]);
export const adapterMaturitySchema = z.enum([
  "registry_only",
  "fixture_adapter",
  "local_file_adapter",
  "network_opt_in",
  "production_ready",
  "blocked",
  "deprecated",
]);
export const adapterQualityLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export const coverageScopeSchema = z.enum(["statewide", "state_agency_partial", "local_only", "unknown"]);
export const sourceResearchOutcomeSchema = z.enum(["production_ready", "network_opt_in", "local_file_adapter", "blocked", "deprecated"]);
export const sourceBlockerCodeSchema = z.enum([
  "terms",
  "access_controls",
  "no_stable_source",
  "scope_mismatch",
  "no_public_records",
  "technical_instability",
  "deprecated_source",
]);

export const sourceResearchEvidenceSchema = z.object({
  url: z.string().url(),
  checkedAt: z.string().datetime(),
  note: z.string().min(1),
});

export const sourceBlockerSchema = z.object({
  code: sourceBlockerCodeSchema,
  summary: z.string().min(1),
  evidenceUrls: z.array(z.string().url()).min(1),
});

export const sourceAutomationModeSchema = z.enum([
  "bulk",
  "api",
  "browser_lookup",
  "manual_handoff",
  "blocked",
  "deprecated",
]);

export const sourceAccessControlsSchema = z.object({
  javascript: z.boolean(),
  captcha: z.boolean(),
  account: z.boolean(),
  paywall: z.boolean(),
  antiBot: z.enum(["not_observed", "present", "unknown"]),
  notes: z.array(z.string().min(1)).optional(),
});

export const sourcePublicationPolicySchema = z.object({
  records: z.enum(["allowed", "review_required", "restricted", "withheld"]),
  rawRecords: z.enum(["allowed", "review_required", "restricted", "withheld"]),
  reviewedAt: z.string().datetime(),
  notes: z.array(z.string().min(1)).optional(),
});

export const sourcePrivacyPolicySchema = z.object({
  sensitivity: z.enum(["business_only", "personal_contact_possible", "sensitive_personal_data", "unknown"]),
  minimizePersonalData: z.boolean(),
  homeAddressHandling: z.enum(["publish", "redact", "withhold_pending_review", "not_present", "unknown"]),
  notes: z.array(z.string().min(1)).optional(),
});

export const sourceRetentionPolicySchema = z.object({
  snapshots: z.enum(["indefinite", "bounded", "prohibited"]),
  records: z.enum(["indefinite", "bounded", "prohibited"]),
  boundedDays: z.number().int().positive().optional(),
}).superRefine((policy, context) => {
  if ((policy.snapshots === "bounded" || policy.records === "bounded") && policy.boundedDays === undefined) {
    context.addIssue({ code: "custom", path: ["boundedDays"], message: "Bounded retention requires boundedDays." });
  }
});

export const sourceSynchronizationPolicySchema = z.object({
  mode: z.enum(["scheduled_opt_in", "manual", "on_demand", "disabled"]),
  expectedCadence: z.string().min(1).nullable(),
  requiresExplicitNetworkPermission: z.boolean(),
});

export const sourceFreshnessPolicySchema = z.object({
  staleAfterDays: z.number().int().positive(),
  unavailableAfterDays: z.number().int().positive(),
}).refine((policy) => policy.unavailableAfterDays >= policy.staleAfterDays, {
  message: "unavailableAfterDays must be greater than or equal to staleAfterDays.",
  path: ["unavailableAfterDays"],
});

export const sourceHealthPolicySchema = z.object({
  minimumRecordCount: z.number().int().nonnegative().optional(),
  maximumCountDeltaRatio: z.number().min(0).max(1).optional(),
  requiredFields: z.array(z.string().min(1)).optional(),
});

export const sourceRegistryEntrySchema = z.object({
  schemaVersion: z.literal("1.0").optional(),
  id: z.string().min(1),
  name: z.string().min(1),
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
  sourceType: sourceTypeSchema,
  sourceUrl: z.string().url(),
  documentationUrl: z.string().url().nullable().optional(),
  dataDictionaryUrl: z.string().url().nullable().optional(),
  termsUrl: z.string().url().nullable().optional(),
  termsReviewNotes: z.string().min(1).nullable().optional(),
  updateFrequency: z.string().nullable().optional(),
  tradeCoverage: z.array(z.string().min(1)).default([]),
  licenseTypesIncluded: z.array(z.string().min(1)).default([]),
  knownExclusions: z.array(z.string().min(1)).default([]),
  hasBulkDownload: unknownableBooleanSchema,
  hasLiveLookup: unknownableBooleanSchema,
  requiresJavaScript: unknownableBooleanSchema,
  requiresCaptcha: unknownableBooleanSchema,
  requiresAccount: unknownableBooleanSchema,
  rateLimitNotes: z.string().nullable().optional(),
  redistributionStatus: sourceRedistributionStatusSchema,
  publicRecordsNotes: z.string().nullable().optional(),
  adapterStatus: z.enum(["planned", "implemented", "experimental", "blocked", "deprecated"]),
  sourceDiscoveryStatus: sourceDiscoveryStatusSchema,
  adapterMaturity: adapterMaturitySchema,
  adapterQualityLevel: adapterQualityLevelSchema.nullable().optional(),
  coverageScope: coverageScopeSchema,
  adapterPackage: z.string().min(1).nullable().optional(),
  testFixturePath: z.string().min(1).nullable().optional(),
  officialLookupUrl: z.string().url().nullable().optional(),
  officialLookupReviewNotes: z.string().min(1).nullable().optional(),
  officialBulkDownloadNotes: z.string().nullable().optional(),
  researchNotes: z.string().nullable().optional(),
  verificationReviewedAt: z.string().datetime().nullable().optional(),
  verificationCaveats: z.array(z.string().min(1)).optional(),
  verificationNotes: z.string().nullable().optional(),
  lastVerifiedAt: z.string().datetime().nullable().optional(),
  maintainerNotes: z.string().nullable().optional(),
  sourceResearchOutcome: sourceResearchOutcomeSchema.optional(),
  researchReviewedAt: z.string().datetime().optional(),
  nextReviewAt: z.string().datetime().optional(),
  researchEvidence: z.array(sourceResearchEvidenceSchema).optional(),
  blocker: sourceBlockerSchema.optional(),
});

export const sourceRegistryEntryV1Schema = sourceRegistryEntrySchema
  .extend({
    schemaVersion: z.literal("1.0"),
    sourceResearchOutcome: sourceResearchOutcomeSchema,
    researchReviewedAt: z.string().datetime(),
    nextReviewAt: z.string().datetime(),
    researchEvidence: z.array(sourceResearchEvidenceSchema).min(1),
    blocker: sourceBlockerSchema.optional(),
  })
  .superRefine((entry, context) => {
    if (entry.knownExclusions.length === 0) {
      context.addIssue({ code: "custom", path: ["knownExclusions"], message: "v1 sources must document coverage limitations." });
    }

    if (entry.sourceResearchOutcome === "blocked" || entry.sourceResearchOutcome === "deprecated") {
      if (!entry.blocker) {
        context.addIssue({ code: "custom", path: ["blocker"], message: "Blocked and deprecated sources require structured blocker evidence." });
      }
    } else if (entry.blocker) {
      context.addIssue({ code: "custom", path: ["blocker"], message: "Implemented terminal outcomes cannot include a blocker." });
    }

    const expected = terminalOutcomeState[entry.sourceResearchOutcome];
    if (entry.adapterStatus !== expected.adapterStatus) {
      context.addIssue({ code: "custom", path: ["adapterStatus"], message: `Expected ${expected.adapterStatus} for ${entry.sourceResearchOutcome}.` });
    }
    if (entry.adapterMaturity !== expected.adapterMaturity) {
      context.addIssue({ code: "custom", path: ["adapterMaturity"], message: `Expected ${expected.adapterMaturity} for ${entry.sourceResearchOutcome}.` });
    }
  });

export const sourceRegistryEntryV2Schema = sourceRegistryEntrySchema
  .omit({ schemaVersion: true })
  .extend({
    schemaVersion: z.literal("2.0"),
    sourceResearchOutcome: sourceResearchOutcomeSchema,
    researchReviewedAt: z.string().datetime(),
    nextReviewAt: z.string().datetime(),
    researchEvidence: z.array(sourceResearchEvidenceSchema).min(1),
    automationMode: sourceAutomationModeSchema,
    allowedSourceHosts: z.array(z.string().min(1).regex(
      /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
      "Expected a hostname without a scheme or path.",
    )).min(1),
    accessControls: sourceAccessControlsSchema,
    publicationPolicy: sourcePublicationPolicySchema,
    privacyPolicy: sourcePrivacyPolicySchema,
    retentionPolicy: sourceRetentionPolicySchema,
    synchronizationPolicy: sourceSynchronizationPolicySchema,
    freshnessPolicy: sourceFreshnessPolicySchema,
    healthPolicy: sourceHealthPolicySchema,
  })
  .superRefine((entry, context) => {
    if (entry.knownExclusions.length === 0) {
      context.addIssue({ code: "custom", path: ["knownExclusions"], message: "v2 sources must document coverage limitations." });
    }
    if ((entry.sourceResearchOutcome === "blocked" || entry.sourceResearchOutcome === "deprecated") && !entry.blocker) {
      context.addIssue({ code: "custom", path: ["blocker"], message: "Blocked and deprecated sources require structured blocker evidence." });
    }
    if (!["blocked", "deprecated"].includes(entry.sourceResearchOutcome) && entry.blocker) {
      context.addIssue({ code: "custom", path: ["blocker"], message: "Implemented terminal outcomes cannot include a blocker." });
    }
    if (entry.automationMode === "blocked" && entry.sourceResearchOutcome !== "blocked") {
      context.addIssue({ code: "custom", path: ["automationMode"], message: "Blocked automation requires a blocked research outcome." });
    }
  });

const terminalOutcomeState = {
  production_ready: { adapterStatus: "implemented", adapterMaturity: "production_ready" },
  network_opt_in: { adapterStatus: "implemented", adapterMaturity: "network_opt_in" },
  local_file_adapter: { adapterStatus: "implemented", adapterMaturity: "local_file_adapter" },
  blocked: { adapterStatus: "blocked", adapterMaturity: "blocked" },
  deprecated: { adapterStatus: "deprecated", adapterMaturity: "deprecated" },
} as const;

export type SourceRegistryEntry = z.infer<typeof sourceRegistryEntrySchema>;
export type SourceDiscoveryStatus = z.infer<typeof sourceDiscoveryStatusSchema>;
export type AdapterMaturity = z.infer<typeof adapterMaturitySchema>;
export type AdapterQualityLevel = z.infer<typeof adapterQualityLevelSchema>;
export type CoverageScope = z.infer<typeof coverageScopeSchema>;
export type SourceResearchOutcome = z.infer<typeof sourceResearchOutcomeSchema>;
export type SourceBlockerCode = z.infer<typeof sourceBlockerCodeSchema>;
export type SourceResearchEvidence = z.infer<typeof sourceResearchEvidenceSchema>;
export type SourceBlocker = z.infer<typeof sourceBlockerSchema>;
export type SourceRegistryEntryV1 = z.infer<typeof sourceRegistryEntryV1Schema>;
export type SourceAutomationMode = z.infer<typeof sourceAutomationModeSchema>;
export type SourceAccessControls = z.infer<typeof sourceAccessControlsSchema>;
export type SourcePublicationPolicy = z.infer<typeof sourcePublicationPolicySchema>;
export type SourcePrivacyPolicy = z.infer<typeof sourcePrivacyPolicySchema>;
export type SourceRetentionPolicy = z.infer<typeof sourceRetentionPolicySchema>;
export type SourceSynchronizationPolicy = z.infer<typeof sourceSynchronizationPolicySchema>;
export type SourceFreshnessPolicy = z.infer<typeof sourceFreshnessPolicySchema>;
export type SourceHealthPolicy = z.infer<typeof sourceHealthPolicySchema>;
export type SourceRegistryEntryV2 = z.infer<typeof sourceRegistryEntryV2Schema>;
