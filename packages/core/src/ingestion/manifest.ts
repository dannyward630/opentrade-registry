import { z } from "zod";

export const importManifestStatusSchema = z.enum([
  "pending",
  "processing",
  "validated",
  "promoted",
  "failed",
  "rejected",
  "cancelled",
]);

export const importManifestSchema = z.object({
  schemaVersion: z.literal("2.0"),
  id: z.string().min(1),
  sourceId: z.string().min(1),
  sourceSnapshotId: z.string().min(1),
  adapterPackage: z.string().min(1),
  adapterVersion: z.string().min(1),
  status: importManifestStatusSchema,
  rawRecordCount: z.number().int().nonnegative(),
  normalizedRecordCount: z.number().int().nonnegative(),
  duplicateRecordCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable().optional(),
  promotedAt: z.string().datetime().nullable().optional(),
  schemaDrift: z.array(z.string().min(1)).default([]),
  strictMode: z.boolean().default(false),
  failure: z.object({ code: z.string().min(1), message: z.string().min(1) }).nullable().optional(),
});

export const stagedImportRecordSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordKey: z.string().min(1),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  recordVersionId: z.string().min(1).optional(),
});

export type ImportManifestStatus = z.infer<typeof importManifestStatusSchema>;
export type ImportManifest = z.infer<typeof importManifestSchema>;
export type StagedImportRecord = z.infer<typeof stagedImportRecordSchema>;

export type PromotionAction = {
  sourceRecordKey: string;
  changeType: "added" | "changed" | "removed";
  previousFingerprint?: string;
  nextFingerprint?: string;
};

export type PromotionPlan = {
  sourceId: string;
  actions: PromotionAction[];
  addedCount: number;
  changedCount: number;
  removedCount: number;
  unchangedCount: number;
};

export function assertPromotionReady(
  manifestInput: ImportManifest,
  recordsInput: StagedImportRecord[],
): { manifest: ImportManifest; records: StagedImportRecord[] } {
  const manifest = importManifestSchema.parse(manifestInput);
  const records = recordsInput.map((record) => stagedImportRecordSchema.parse(record));

  if (manifest.status !== "validated") {
    throw new Error(`Import ${manifest.id} must be validated before promotion.`);
  }
  if (manifest.errorCount > 0) {
    throw new Error(`Import ${manifest.id} has ${manifest.errorCount} error(s) and cannot be promoted.`);
  }
  if (manifest.schemaDrift.length > 0) {
    throw new Error(`Import ${manifest.id} has unresolved schema drift.`);
  }
  if (records.length !== manifest.normalizedRecordCount) {
    throw new Error(`Import ${manifest.id} normalized count does not match staged records.`);
  }

  const keys = new Set<string>();
  for (const record of records) {
    if (record.sourceId !== manifest.sourceId) {
      throw new Error(`Staged record ${record.sourceRecordKey} belongs to ${record.sourceId}, not ${manifest.sourceId}.`);
    }
    if (keys.has(record.sourceRecordKey)) {
      throw new Error(`Import ${manifest.id} contains duplicate source record key ${record.sourceRecordKey}.`);
    }
    keys.add(record.sourceRecordKey);
  }

  return { manifest, records };
}

export function buildPromotionPlan(
  manifestInput: ImportManifest,
  previousInput: StagedImportRecord[],
  nextInput: StagedImportRecord[],
): PromotionPlan {
  const { manifest, records: next } = assertPromotionReady(manifestInput, nextInput);
  const previous = previousInput.map((record) => stagedImportRecordSchema.parse(record));
  const previousByKey = indexRecords(previous, manifest.sourceId);
  const nextByKey = indexRecords(next, manifest.sourceId);
  const actions: PromotionAction[] = [];

  for (const [sourceRecordKey, nextRecord] of nextByKey) {
    const previousRecord = previousByKey.get(sourceRecordKey);
    if (!previousRecord) {
      actions.push({ sourceRecordKey, changeType: "added", nextFingerprint: nextRecord.fingerprint });
    } else if (previousRecord.fingerprint !== nextRecord.fingerprint) {
      actions.push({ sourceRecordKey, changeType: "changed", previousFingerprint: previousRecord.fingerprint, nextFingerprint: nextRecord.fingerprint });
    }
  }
  for (const [sourceRecordKey, previousRecord] of previousByKey) {
    if (!nextByKey.has(sourceRecordKey)) {
      actions.push({ sourceRecordKey, changeType: "removed", previousFingerprint: previousRecord.fingerprint });
    }
  }

  actions.sort((left, right) => left.sourceRecordKey.localeCompare(right.sourceRecordKey));
  const changedCount = actions.filter((action) => action.changeType === "changed").length;
  const addedCount = actions.filter((action) => action.changeType === "added").length;
  const removedCount = actions.filter((action) => action.changeType === "removed").length;
  return {
    sourceId: manifest.sourceId,
    actions,
    addedCount,
    changedCount,
    removedCount,
    unchangedCount: next.length - addedCount - changedCount,
  };
}

function indexRecords(records: StagedImportRecord[], sourceId: string): Map<string, StagedImportRecord> {
  const indexed = new Map<string, StagedImportRecord>();
  for (const record of records) {
    if (record.sourceId !== sourceId) {
      throw new Error(`Record ${record.sourceRecordKey} belongs to ${record.sourceId}, not ${sourceId}.`);
    }
    if (indexed.has(record.sourceRecordKey)) {
      throw new Error(`Duplicate source record key ${record.sourceRecordKey}.`);
    }
    indexed.set(record.sourceRecordKey, record);
  }
  return indexed;
}
