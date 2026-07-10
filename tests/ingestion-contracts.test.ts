import { describe, expect, it } from "vitest";
import {
  assertPromotionReady,
  buildPromotionPlan,
  importManifestSchema,
  type ImportManifest,
  type StagedImportRecord,
} from "@opentrade-registry/core";

const sourceId = "us.fl.dbpr.construction";
const baseManifest: ImportManifest = {
  schemaVersion: "2.0",
  id: "import-1",
  sourceId,
  sourceSnapshotId: "snapshot-1",
  adapterPackage: "@opentrade-registry/adapter-fl-dbpr",
  adapterVersion: "1.0.1",
  status: "validated",
  rawRecordCount: 3,
  normalizedRecordCount: 3,
  duplicateRecordCount: 0,
  warningCount: 1,
  errorCount: 0,
  startedAt: "2026-07-10T00:00:00.000Z",
  finishedAt: "2026-07-10T00:01:00.000Z",
  schemaDrift: [],
  strictMode: false,
};

const previous: StagedImportRecord[] = [
  { sourceId, sourceRecordKey: "a", fingerprint: "a".repeat(64) },
  { sourceId, sourceRecordKey: "b", fingerprint: "b".repeat(64) },
];

describe("v2 ingestion contracts", () => {
  it("parses manifests and requires validated, error-free, drift-free promotion", () => {
    expect(importManifestSchema.parse(baseManifest)).toMatchObject({ id: "import-1", status: "validated" });
    expect(() => assertPromotionReady({ ...baseManifest, status: "processing" }, previous)).toThrow(/validated/);
    expect(() => assertPromotionReady({ ...baseManifest, errorCount: 1 }, previous)).toThrow(/error/);
    expect(() => assertPromotionReady({ ...baseManifest, schemaDrift: ["new column"] }, previous)).toThrow(/schema drift/);
  });

  it("builds a deterministic atomic promotion plan", () => {
    const next: StagedImportRecord[] = [
      { sourceId, sourceRecordKey: "a", fingerprint: "a".repeat(64) },
      { sourceId, sourceRecordKey: "b", fingerprint: "c".repeat(64) },
      { sourceId, sourceRecordKey: "c", fingerprint: "d".repeat(64) },
    ];
    const plan = buildPromotionPlan(baseManifest, previous, next);
    expect(plan).toMatchObject({ sourceId, addedCount: 1, changedCount: 1, removedCount: 0, unchangedCount: 1 });
    expect(plan.actions.map((action) => [action.sourceRecordKey, action.changeType])).toEqual([
      ["b", "changed"],
      ["c", "added"],
    ]);
  });

  it("rejects duplicate keys, cross-source rows, and count mismatches", () => {
    const duplicate = [{ ...previous[0]!, ...{ sourceRecordKey: "a" } }, { ...previous[0]!, ...{ sourceRecordKey: "a" } }, previous[1]!];
    expect(() => assertPromotionReady(baseManifest, duplicate)).toThrow(/duplicate/i);
    expect(() => assertPromotionReady(baseManifest, [...previous, { sourceId: "us.tx.tdlr.all_licenses", sourceRecordKey: "c", fingerprint: "c".repeat(64) }])).toThrow(/belongs/);
    expect(() => assertPromotionReady({ ...baseManifest, normalizedRecordCount: 1 }, previous)).toThrow(/count/);
  });
});
