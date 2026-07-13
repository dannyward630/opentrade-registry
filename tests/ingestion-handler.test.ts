import { describe, expect, it, vi } from "vitest";
import {
  createPostgresImportStore,
  createSnapshotImportHandler,
  type ImportManifestHandle,
  type ImportStore,
} from "../services/ingestion-worker/src/import-handler.js";
import type { WorkerSqlClient } from "../services/ingestion-worker/src/worker.js";
import type { SnapshotArchive } from "../services/ingestion-worker/src/archive.js";
import { StoragePressureAdmissionError } from "../services/ingestion-worker/src/storage-pressure.js";
import type {
  CanonicalTradeLicenseRecord,
  TradeLicenseSourceAdapter,
} from "@opentrade-registry/core";

const sourceId = "us.fl.dbpr.construction";
const fetchedAt = "2026-07-10T12:00:00.000Z";

describe("snapshot import handler", () => {
  it("migrates adapter records, stages them, validates counts, and promotes atomically", async () => {
    const store = memoryStore();
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a"), record("CGC0002", "b")])]]),
      store,
      now: () => fetchedAt,
      ...fileVerification(),
    });

    const result = await handler(job({ filePath: "/tmp/sample.csv" }), context());

    expect(result).toMatchObject({
      sourceId,
      manifestId: "manifest-1",
      rawRecordCount: 2,
      normalizedRecordCount: 2,
      duplicateRecordCount: 0,
      errorCount: 0,
      promoted: true,
    });
    expect(store.state.staged).toHaveLength(2);
    expect(store.state.staged[0]?.record.schemaVersion).toBe("2.0");
    expect(store.state.staged[0]?.record.sourceSnapshotId).toBe("snapshot-public-1");
    expect(store.state.validated).toHaveLength(1);
    expect(store.state.promoted).toBe(1);
    expect(store.state.failed).toHaveLength(0);
  });

  it("deduplicates source keys without publishing a duplicate", async () => {
    const store = memoryStore();
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a"), record("CGC0001", "b")])]]),
      store,
      now: () => fetchedAt,
      ...fileVerification(),
    });

    const result = await handler(job({ filePath: "/tmp/sample.csv" }), context());

    expect(result).toMatchObject({ duplicateRecordCount: 1, normalizedRecordCount: 1, promoted: true });
    expect(store.state.staged).toHaveLength(1);
    expect(store.state.promoted).toBe(1);
  });

  it("fails validation when the adapter reports a malformed row", async () => {
    const store = memoryStore();
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a")], true)]]),
      store,
      now: () => fetchedAt,
      ...fileVerification(),
    });

    await expect(handler(job({ filePath: "/tmp/sample.csv" }), context())).rejects.toThrow("error(s)");
    expect(store.state.validated).toHaveLength(0);
    expect(store.state.promoted).toBe(0);
    expect(store.state.failed).toHaveLength(1);
    expect(store.state.failed[0]?.stats.errorCount).toBe(1);
  });

  it("does not promote when the snapshot changes during parsing", async () => {
    const store = memoryStore();
    let inspection = 0;
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a")])]]),
      store,
      now: () => fetchedAt,
      allowedSnapshotRoot: "/tmp",
      maxSnapshotBytes: 1_024,
      inspectFile: async () => ({
        filePath: "/tmp/sample.csv",
        sha256: (inspection++ === 0 ? "c" : "d").repeat(64),
        bytes: 42,
      }),
      archiveBucket: "opentrade-snapshots",
      archive: archiveStub(),
      storageAdmission: async () => storagePressure("healthy", 50),
    });

    await expect(handler(job({ filePath: "/tmp/sample.csv" }), context())).rejects.toThrow("SHA-256");
    expect(store.state.staged).toHaveLength(1);
    expect(store.state.promoted).toBe(0);
    expect(store.state.failed).toHaveLength(1);
  });

  it("does not promote when the archived object is unavailable after parsing", async () => {
    const store = memoryStore();
    let verification = 0;
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a")])]]),
      store,
      now: () => fetchedAt,
      ...fileVerification(),
      archive: {
        async ensureArchived(input) {
          if (verification++ > 0) throw new Error("archive unavailable");
          return archiveEvidence(input);
        },
      },
    });

    await expect(handler(job({ filePath: "/tmp/sample.csv" }), context())).rejects.toThrow("archive unavailable");
    expect(store.state.staged).toHaveLength(1);
    expect(store.state.promoted).toBe(0);
    expect(store.state.failed).toHaveLength(1);
  });

  it("does not begin an import when storage admission is unavailable", async () => {
    const store = memoryStore();
    const archive = { ensureArchived: vi.fn(archiveStub().ensureArchived) };
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a")])]]),
      store,
      now: () => fetchedAt,
      ...fileVerification(),
      archive,
      storageAdmission: async () => { throw new StoragePressureAdmissionError("Storage health status is stale."); },
    });

    await expect(handler(job({ filePath: "/tmp/sample.csv" }), context())).rejects.toThrow("stale");
    expect(archive.ensureArchived).not.toHaveBeenCalled();
    expect(store.state.staged).toHaveLength(0);
    expect(store.state.failed).toHaveLength(0);
  });

  it("fails the manifest instead of promoting when storage becomes critical", async () => {
    const store = memoryStore();
    let check = 0;
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a")])]]),
      store,
      now: () => fetchedAt,
      ...fileVerification(),
      storageAdmission: async () => {
        if (check++ > 0) throw new StoragePressureAdmissionError("Snapshot storage is below the ingestion stop threshold.");
        return storagePressure("healthy", 50);
      },
    });

    await expect(handler(job({ filePath: "/tmp/sample.csv" }), context())).rejects.toThrow("ingestion stop threshold");
    expect(store.state.staged).toHaveLength(1);
    expect(store.state.validated).toHaveLength(0);
    expect(store.state.promoted).toBe(0);
    expect(store.state.failed).toHaveLength(1);
  });

  it("records one structured warning when storage remains below the warning threshold", async () => {
    const store = memoryStore();
    const handler = createSnapshotImportHandler({
      adapters: new Map([[sourceId, fakeAdapter([record("CGC0001", "a")])]]),
      store,
      now: () => fetchedAt,
      ...fileVerification(),
      storageAdmission: async () => storagePressure("warning", 12),
    });

    await expect(handler(job({ filePath: "/tmp/sample.csv" }), context())).resolves.toMatchObject({
      warningCount: 1,
      warnings: ["Snapshot storage warning: 12% free; ingestion stops below 10%."],
      storagePressure: {
        started: { status: "warning", freePercent: 12 },
        promotion: { status: "warning", freePercent: 12 },
      },
      promoted: true,
    });
  });
});

describe("Postgres import store", () => {
  it("uses parameterized staging and the atomic promotion function", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sql: WorkerSqlClient = {
      async query(query, values = []) {
        calls.push({ sql: query, values });
        if (query.includes("insert into opentrade.import_manifests")) return { rows: [{ database_id: "41", manifest_id: "manifest-public-1" }] };
        if (query.includes("insert into opentrade.record_versions")) return { rows: [{ record_version_id: "99" }] };
        return { rows: [] };
      },
    };
    const store = createPostgresImportStore(sql);
    const manifest = await store.createManifest({ sourceId, sourceSnapshotDatabaseId: 17, adapterPackage: "@opentrade/adapter-fl-dbpr", adapterVersion: "1.0.1", startedAt: fetchedAt, strict: true });
    await store.markProcessing(manifest);
    const v2 = {
      ...record("CGC0001", "a"),
      schemaVersion: "2.0" as const,
      id: `${sourceId}:CGC0001`,
      recordVersion: "a".repeat(64),
      sourceSnapshotId: "snapshot-public-1",
      observedAt: fetchedAt,
      publication: { disposition: "review_required" as const, rawRecordDisposition: "restricted" as const, reviewedAt: fetchedAt },
      sensitivity: { level: "unknown" as const, containsHomeAddress: "unknown" as const, containsPersonalEmail: "unknown" as const, containsPersonalPhone: "unknown" as const },
    };
    await store.stageRecord({ manifest, sourceRecordKey: "CGC0001", record: v2 });
    await store.markValidated({ manifest, stats: { rawRecordCount: 1, normalizedRecordCount: 1, duplicateRecordCount: 0, warningCount: 0, errorCount: 0 }, finishedAt: fetchedAt, schemaDrift: [], strict: true });
    await store.promote(manifest);

    expect(calls.some((call) => call.sql.includes("current_records"))).toBe(false);
    expect(calls.at(-1)?.sql).toContain("select opentrade.promote_import($1)");
    expect(calls.find((call) => call.sql.includes("record_versions"))?.values[1]).toBe(17);
    expect(calls.find((call) => call.sql.includes("record_versions"))?.values).not.toContain("CGC0001\" or 1=1");
  });
});

function job(payload: Record<string, unknown>) {
  return {
    id: 1,
    publicId: "job-public-1",
    queue: "ingestion",
    kind: "snapshot_import",
    sourceId,
    status: "processing" as const,
    attempts: 1,
    maxAttempts: 5,
    payload: {
      sourceId,
      filePath: "/tmp/sample.csv",
      sourceUrl: "https://example.gov/licenses.csv",
      sourceSnapshotId: "snapshot-public-1",
      sourceSnapshotDatabaseId: 17,
      fetchedAt,
      adapterPackage: "@opentrade/adapter-fl-dbpr",
      adapterVersion: "1.0.1",
      sha256: "c".repeat(64),
      objectKey: "us/fl/dbpr/snapshot.csv",
      contentType: "text/csv",
      strict: true,
      publication: { disposition: "review_required", rawRecordDisposition: "restricted", reviewedAt: fetchedAt },
      sensitivity: { level: "unknown", containsHomeAddress: "unknown", containsPersonalEmail: "unknown", containsPersonalPhone: "unknown" },
      ...payload,
    },
  };
}

function fileVerification() {
  return {
    allowedSnapshotRoot: "/tmp",
    maxSnapshotBytes: 1_024,
    inspectFile: async () => ({ filePath: "/tmp/sample.csv", sha256: "c".repeat(64), bytes: 42 }),
    archiveBucket: "opentrade-snapshots",
    archive: archiveStub(),
    storageAdmission: async () => storagePressure("healthy", 50),
  };
}

function storagePressure(status: "healthy" | "warning" | "critical", freePercent: number) {
  return {
    schemaVersion: "1.0" as const,
    path: "/snapshots",
    status,
    totalBytes: "100",
    availableBytes: String(freePercent),
    freePercent,
    warningFreePercent: 15,
    stopFreePercent: 10,
    checkedAt: fetchedAt,
  };
}

function archiveStub() {
  return { async ensureArchived(input: Parameters<SnapshotArchive["ensureArchived"]>[0]) { return archiveEvidence(input); } };
}

function archiveEvidence(input: Parameters<SnapshotArchive["ensureArchived"]>[0]) {
  return { ...input, etag: "etag", versionId: "version-1", lastModifiedAt: fetchedAt, verifiedAt: fetchedAt };
}

function context() {
  return {
    signal: new AbortController().signal,
    heartbeat: async () => undefined,
  };
}

function record(licenseNumber: string, fingerprintSeed: string): CanonicalTradeLicenseRecord {
  return {
    schemaVersion: "1.0",
    sourceId,
    jurisdiction: { country: "US", state: "FL" },
    agency: { name: "Florida Department of Business and Professional Regulation", url: "https://www2.myfloridalicense.com/" },
    source: { sourceUrl: "https://example.gov/licenses.csv", sourceType: "bulk_csv", fetchedAt, redistributionStatus: "unknown", caveats: ["Fixture-derived test record."] },
    license: { licenseNumber, licenseNumberNormalized: licenseNumber, typeCode: "CGC", typeLabel: "Certified General Contractor", tradeCategories: ["general_contracting"] },
    identity: { businessName: "Example Builders", licenseeName: "Example Builders LLC" },
    status: { normalized: "active", isCurrent: true },
    dates: {},
    contact: {},
    raw: { record: { licenseNumber, fingerprintSeed }, fingerprint: fingerprintSeed.repeat(64) },
  };
}

function fakeAdapter(records: CanonicalTradeLicenseRecord[], reportError = false): TradeLicenseSourceAdapter {
  return {
    sourceId,
    async getSourceMetadata() { return {} as Awaited<ReturnType<TradeLicenseSourceAdapter["getSourceMetadata"]>>; },
    async checkAvailability() { return { ok: true, checkedAt: fetchedAt }; },
    async *streamRawRecords(options) {
      if (reportError) options.onError?.({ code: "malformed_row", message: "Malformed fixture row.", rowNumber: 2 });
      for (const [index, value] of records.entries()) {
        yield { sourceId, sourceUrl: "https://example.gov/licenses.csv", record: value, rowNumber: index + 2, fetchedAt, fingerprint: value.raw.fingerprint };
      }
    },
    async normalize(raw) { return raw.record as CanonicalTradeLicenseRecord; },
  };
}

function memoryStore(): ImportStore & { state: { staged: Array<{ sourceRecordKey: string; record: CanonicalTradeLicenseRecord & { schemaVersion?: string; sourceSnapshotId?: string } }>; validated: Array<unknown>; failed: Array<{ stats: { errorCount: number } }>; promoted: number } } {
  const state = { staged: [], validated: [], failed: [], promoted: 0 } as ReturnType<typeof memoryStore>["state"];
  const manifest: ImportManifestHandle = { databaseId: 41, manifestId: "manifest-1", sourceSnapshotDatabaseId: 17 };
  return {
    state,
    async createManifest() { return manifest; },
    async markProcessing() {},
    async stageRecord(input) {
      state.staged.push({ sourceRecordKey: input.sourceRecordKey, record: input.record });
      return { recordVersionId: `record-version-${state.staged.length}` };
    },
    async markValidated(input) { state.validated.push(input); },
    async markFailed(input) { state.failed.push(input); },
    async promote() { state.promoted += 1; },
  };
}
