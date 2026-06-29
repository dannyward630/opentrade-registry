import { z } from "zod";

export const boardAccessPathSchema = z.enum([
  "production_adapter",
  "network_opt_in",
  "local_file",
  "browser_lookup",
  "manual_handoff",
  "blocked",
  "deprecated",
]);

export const boardInventoryEntrySchema = z.object({
  id: z.string().min(1),
  jurisdiction: z.object({
    country: z.literal("US"),
    state: z.string().length(2),
  }),
  boardName: z.string().min(1),
  agencyName: z.string().min(1),
  officialUrl: z.string().url(),
  sourceIds: z.array(z.string().min(1)).min(1),
  trades: z.array(z.string().min(1)).min(1),
  accessPath: boardAccessPathSchema,
  coverageLimitations: z.array(z.string().min(1)).min(1),
  evidence: z.object({
    url: z.string().url(),
    reviewedAt: z.string().datetime(),
    note: z.string().min(1),
  }),
});

export const nationwideBoardInventorySchema = z.object({
  schemaVersion: z.literal("2.0"),
  completeness: z.enum(["representative_source_baseline", "board_complete"]),
  scope: z.object({
    jurisdictions: z.enum(["states_dc_major_territories"]),
    municipalLicensing: z.literal("excluded"),
    notes: z.array(z.string().min(1)).min(1),
  }),
  boards: z.array(boardInventoryEntrySchema).min(1),
});

export type BoardAccessPath = z.infer<typeof boardAccessPathSchema>;
export type BoardInventoryEntry = z.infer<typeof boardInventoryEntrySchema>;
export type NationwideBoardInventory = z.infer<typeof nationwideBoardInventorySchema>;
