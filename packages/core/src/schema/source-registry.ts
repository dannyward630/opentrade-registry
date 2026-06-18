import { z } from "zod";
import { sourceRedistributionStatusSchema, sourceTypeSchema } from "./canonical-license.js";

const unknownableBooleanSchema = z.union([z.boolean(), z.literal("unknown")]);

export const sourceRegistryEntrySchema = z.object({
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
  adapterStatus: z.enum(["planned", "implemented", "experimental", "deprecated"]),
  adapterPackage: z.string().min(1).nullable().optional(),
  testFixturePath: z.string().min(1).nullable().optional(),
  lastVerifiedAt: z.string().datetime().nullable().optional(),
  maintainerNotes: z.string().nullable().optional(),
});

export type SourceRegistryEntry = z.infer<typeof sourceRegistryEntrySchema>;

