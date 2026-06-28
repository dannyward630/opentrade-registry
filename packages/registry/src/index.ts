import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import {
  normalizeLicenseNumber,
  parseCanonicalTradeLicenseRecord,
  type AdapterError,
  type AdapterWarning,
  type CanonicalTradeLicenseRecord,
  type ImportStats,
  type TradeLicenseSourceAdapter,
  type TradeLicenseVerificationResult,
  type VerificationWarning,
} from "@opentrade/core";
import type { OpenTradeSqliteCache, SqliteImportRun } from "@opentrade/storage-sqlite";
import { downloadOfficialSource, type DownloadOptions, type DownloadedSource } from "./network.js";

export { downloadOfficialSource, type DownloadOptions, type DownloadedSource } from "./network.js";

export type RegistryInput =
  | { mode: "file"; filePath: string; sourceUrl?: string; fetchedAt?: string; sourceLastModifiedAt?: string | null }
  | { mode: "cache" }
  | { mode: "network"; url: string; allowNetwork: boolean; download?: Omit<DownloadOptions, "allowedHosts"> };

export type RegistrySyncResult = {
  status: "completed" | "unsupported" | "blocked" | "failed";
  sourceId: string;
  adapterMaturity?: string;
  stats: ImportStats;
  warnings: AdapterWarning[];
  errors: AdapterError[];
  records?: CanonicalTradeLicenseRecord[];
  importRun?: SqliteImportRun;
};

export type RegistrySyncOptions = {
  sourceId: string;
  input: Exclude<RegistryInput, { mode: "cache" }>;
  strict?: boolean;
  collectRecords?: boolean;
  cache?: OpenTradeSqliteCache;
  importRunId?: string;
  resumable?: boolean;
  checkpointInterval?: number;
  resumeFromRunId?: string;
  retainedUntil?: string | null;
  signal?: AbortSignal;
  onRecord?: (record: CanonicalTradeLicenseRecord) => void | Promise<void>;
};

export type RegistryVerifyOptions = {
  sourceId: string;
  licenseNumber: string;
  input: RegistryInput;
  cache?: OpenTradeSqliteCache;
  signal?: AbortSignal;
};

export class OpenTradeRegistry {
  readonly adapters: ReadonlyMap<string, TradeLicenseSourceAdapter>;

  constructor(adapters: Iterable<TradeLicenseSourceAdapter>) {
    this.adapters = new Map([...adapters].map((adapter) => [adapter.sourceId, adapter]));
  }

  async sync(options: RegistrySyncOptions): Promise<RegistrySyncResult> {
    const startedAt = new Date().toISOString();
    const stats: ImportStats = { sourceId: options.sourceId, startedAt, rawRecordCount: 0, normalizedRecordCount: 0, duplicateRecordCount: 0, warningCount: 0, errorCount: 0 };
    const adapter = this.adapters.get(options.sourceId);
    if (!adapter) return { status: "unsupported", sourceId: options.sourceId, stats: { ...stats, finishedAt: new Date().toISOString() }, warnings: [], errors: [{ code: "adapter_not_available", message: `No adapter is registered for ${options.sourceId}.` }] };
    const metadata = await adapter.getSourceMetadata();
    if (metadata.adapterMaturity === "blocked" || metadata.adapterMaturity === "deprecated") {
      return { status: "blocked", sourceId: options.sourceId, adapterMaturity: metadata.adapterMaturity, stats: { ...stats, finishedAt: new Date().toISOString() }, warnings: [], errors: [{ code: metadata.blocker?.code ?? "source_blocked", message: metadata.blocker?.summary ?? "The source is not available for automated ingestion." }] };
    }
    const warnings: AdapterWarning[] = [];
    const errors: AdapterError[] = [];
    const records: CanonicalTradeLicenseRecord[] = [];
    let cleanupDownload: (() => Promise<void>) | undefined;
    let cacheTransactionActive = false;
    let activeImportRunId: string | undefined;
    let lastProcessedRow = 0;
    let recordsSinceCheckpoint = 0;
    const seenFingerprints = new Set<string>();
    try {
      if ((options.resumable || options.resumeFromRunId) && !options.cache) throw new Error("Resumable imports require a SQLite cache.");
      const checkpointInterval = options.checkpointInterval ?? 1_000;
      if (!Number.isInteger(checkpointInterval) || checkpointInterval < 1) throw new Error("checkpointInterval must be a positive integer.");

      const resolvedInput = await resolveStreamInput(metadata, options.input, options.signal, (value) => { cleanupDownload = value.cleanup; });
      const streamOptions = resolvedInput.streamOptions;
      if (options.cache) {
        if (options.resumeFromRunId) {
          const previous = options.cache.getImportRun(options.resumeFromRunId);
          if (!previous) throw new Error(`Unknown import run: ${options.resumeFromRunId}`);
          if (!options.resumable || previous.status !== "interrupted") throw new Error(`Import run ${previous.id} is not resumable.`);
          if (previous.sourceId !== options.sourceId) throw new Error(`Import run ${previous.id} belongs to ${previous.sourceId}.`);
          if (previous.sourceSha256 !== resolvedInput.sha256) throw new Error("Import source checksum does not match the interrupted run.");
          activeImportRunId = previous.id;
          lastProcessedRow = previous.lastProcessedRow;
          stats.startedAt = previous.startedAt;
          stats.rawRecordCount = previous.rawRecordCount;
          stats.normalizedRecordCount = previous.normalizedRecordCount;
          stats.duplicateRecordCount = previous.duplicateRecordCount;
          stats.warningCount = previous.warningCount;
          stats.errorCount = previous.errorCount;
          options.cache.resumeImportRun(previous.id);
        } else {
          activeImportRunId = options.importRunId ?? randomUUID();
          options.cache.startImportRun({
            id: activeImportRunId,
            sourceId: options.sourceId,
            sourceUrl: streamOptions.sourceUrl ?? metadata.sourceUrl,
            sourceSha256: resolvedInput.sha256,
            startedAt,
          });
        }
      }
      if (options.cache) {
        options.cache.beginImport();
        cacheTransactionActive = true;
      }
      const onStreamError = (error: AdapterError) => {
        lastProcessedRow = Math.max(lastProcessedRow, error.rowNumber ?? 0);
        errors.push(error);
        if (options.strict) throw new Error(error.message);
      };
      for await (const raw of adapter.streamRawRecords({ ...streamOptions, signal: options.signal, strict: options.strict, startAfterRow: lastProcessedRow, onError: onStreamError })) {
        options.signal?.throwIfAborted();
        lastProcessedRow = Math.max(lastProcessedRow, raw.rowNumber ?? 0);
        stats.rawRecordCount += 1;
        warnings.push(...(raw.warnings ?? []));
        if (seenFingerprints.has(raw.fingerprint)) {
          stats.duplicateRecordCount += 1;
          warnings.push({ code: "duplicate_source_record", message: `Skipped duplicate source record ${raw.rowNumber ?? "unknown"}.`, recordFingerprint: raw.fingerprint });
          continue;
        }
        seenFingerprints.add(raw.fingerprint);
        let record: CanonicalTradeLicenseRecord;
        try {
          const normalized = await adapter.normalize(raw);
          record = parseCanonicalTradeLicenseRecord({
            ...normalized,
            source: { ...normalized.source, importRunId: activeImportRunId ?? normalized.source.importRunId },
          });
        } catch (error) {
          const item = { code: "record_normalization_failed", message: `Failed to normalize record ${raw.rowNumber ?? "unknown"}: ${errorMessage(error)}`, cause: error, rowNumber: raw.rowNumber, recordFingerprint: raw.fingerprint };
          errors.push(item);
          if (options.strict) throw error;
          continue;
        }
        stats.normalizedRecordCount += 1;
        if (options.collectRecords) records.push(record);
        options.cache?.importRecord(record, { importRunId: activeImportRunId, retainedUntil: options.retainedUntil });
        await options.onRecord?.(record);
        recordsSinceCheckpoint += 1;
        if (options.resumable && options.cache && recordsSinceCheckpoint >= checkpointInterval) {
          options.cache.commitImport();
          cacheTransactionActive = false;
          checkpointImportRun(
            options.cache,
            activeImportRunId!,
            lastProcessedRow,
            stats,
            stats.warningCount + warnings.length,
            stats.errorCount + errors.length,
          );
          await options.cache.save();
          options.cache.beginImport();
          cacheTransactionActive = true;
          recordsSinceCheckpoint = 0;
        }
      }
      stats.warningCount += warnings.length;
      stats.errorCount += errors.length;
      stats.finishedAt = new Date().toISOString();
      if (options.cache) {
        options.cache.commitImport();
        cacheTransactionActive = false;
        checkpointImportRun(options.cache, activeImportRunId!, lastProcessedRow, stats, stats.warningCount, stats.errorCount);
        options.cache.finishImportRun(activeImportRunId!, { status: "completed", finishedAt: stats.finishedAt });
      }
      await options.cache?.save();
      return { status: "completed", sourceId: options.sourceId, adapterMaturity: metadata.adapterMaturity, stats, warnings, errors, records: options.collectRecords ? records : undefined, importRun: activeImportRunId ? options.cache?.getImportRun(activeImportRunId) ?? undefined : undefined };
    } catch (error) {
      if (cacheTransactionActive) {
        if (options.resumable && options.signal?.aborted) options.cache?.commitImport();
        else options.cache?.rollbackImport();
        cacheTransactionActive = false;
      }
      stats.finishedAt = new Date().toISOString();
      errors.push({ code: "sync_failed", message: errorMessage(error), cause: error });
      stats.warningCount += warnings.length;
      stats.errorCount += errors.length;
      if (options.cache && activeImportRunId) {
        checkpointImportRun(options.cache, activeImportRunId, lastProcessedRow, stats, stats.warningCount, stats.errorCount);
        options.cache.finishImportRun(activeImportRunId, { status: options.signal?.aborted && options.resumable ? "interrupted" : "failed", finishedAt: stats.finishedAt });
        await options.cache.save();
      }
      return { status: "failed", sourceId: options.sourceId, adapterMaturity: metadata.adapterMaturity, stats, warnings, errors, records: options.collectRecords ? records : undefined, importRun: activeImportRunId ? options.cache?.getImportRun(activeImportRunId) ?? undefined : undefined };
    } finally {
      await cleanupDownload?.();
    }
  }

  async verify(options: RegistryVerifyOptions): Promise<TradeLicenseVerificationResult> {
    const adapter = this.adapters.get(options.sourceId);
    const checkedAt = new Date().toISOString();
    if (!adapter) return unavailableResult(options, checkedAt, "adapter_not_available", `No adapter is registered for ${options.sourceId}.`);
    const metadata = await adapter.getSourceMetadata();
    const jurisdiction = `${metadata.jurisdiction.country}-${metadata.jurisdiction.state}`;
    if (metadata.adapterMaturity === "blocked" || metadata.adapterMaturity === "deprecated") return unavailableResult(options, checkedAt, metadata.blocker?.code ?? "source_blocked", metadata.blocker?.summary ?? "The source is unavailable for automated verification.", jurisdiction);
    const normalized = normalizeLicenseNumber(options.licenseNumber);
    if (!normalized) return { sourceId: options.sourceId, jurisdiction, query: { licenseNumber: options.licenseNumber }, result: "missing_required_input", warnings: [], reasons: [{ code: "missing_license_number", message: "Missing or invalid license number." }], checkedAt };
    if (options.input.mode === "cache") {
      if (!options.cache) return unavailableResult(options, checkedAt, "cache_not_available", "A SQLite cache is required for cache verification.", jurisdiction);
      return options.cache.verify(options.sourceId, jurisdiction, normalized);
    }
    let cleanupDownload: (() => Promise<void>) | undefined;
    try {
      const { streamOptions } = await resolveStreamInput(metadata, options.input, options.signal, (value) => { cleanupDownload = value.cleanup; });
      const candidates: CanonicalTradeLicenseRecord[] = [];
      const warnings: VerificationWarning[] = [];
      const onStreamError = (error: AdapterError) => {
        warnings.push({ code: error.code, message: error.message, rowNumber: error.rowNumber, recordFingerprint: error.recordFingerprint });
      };
      for await (const raw of adapter.streamRawRecords({ ...streamOptions, signal: options.signal, onError: onStreamError })) {
        options.signal?.throwIfAborted();
        warnings.push(...(raw.warnings ?? []).map((warning) => ({ ...warning, rowNumber: raw.rowNumber, recordFingerprint: warning.recordFingerprint ?? raw.fingerprint })));
        try {
          const record = parseCanonicalTradeLicenseRecord(await adapter.normalize(raw));
          const numbers = [record.license.licenseNumberNormalized, normalizeLicenseNumber(record.license.licenseNumber), ...(record.license.alternateLicenseNumbers ?? []).map(normalizeLicenseNumber)];
          if (numbers.includes(normalized)) candidates.push(record);
        } catch (error) {
          warnings.push({ code: "record_normalization_failed", message: `Skipped record ${raw.rowNumber ?? "unknown"}: ${errorMessage(error)}`, rowNumber: raw.rowNumber, recordFingerprint: raw.fingerprint });
        }
      }
      if (candidates.length === 0) return { sourceId: options.sourceId, jurisdiction, query: { licenseNumber: options.licenseNumber }, result: "not_found", warnings, reasons: [{ code: "no_match_in_source", message: "No matching record was found in this source as of the checked time." }], checkedAt };
      if (candidates.length > 1) return { sourceId: options.sourceId, jurisdiction, query: { licenseNumber: options.licenseNumber }, result: "ambiguous", candidateRecords: candidates, warnings, reasons: [{ code: "multiple_matches", message: "Multiple matching records were found in this source." }], checkedAt };
      return { sourceId: options.sourceId, jurisdiction, query: { licenseNumber: options.licenseNumber }, result: warnings.some((warning) => warning.code === "record_normalization_failed") ? "matched_with_warnings" : "matched", matchedRecord: candidates[0], warnings, reasons: [], checkedAt };
    } catch (error) {
      return unavailableResult(options, checkedAt, "source_unavailable", errorMessage(error), jurisdiction);
    } finally {
      await cleanupDownload?.();
    }
  }
}

async function resolveStreamInput(metadata: Awaited<ReturnType<TradeLicenseSourceAdapter["getSourceMetadata"]>>, input: Exclude<RegistryInput, { mode: "cache" }>, signal: AbortSignal | undefined, setDownloaded: (download: DownloadedSource) => void) {
  if (input.mode === "file") {
    const filePath = resolve(input.filePath);
    return {
      streamOptions: { filePath, sourceUrl: input.sourceUrl, fetchedAt: input.fetchedAt, sourceLastModifiedAt: input.sourceLastModifiedAt },
      sha256: await hashFile(filePath, signal),
    };
  }
  if (!input.allowNetwork) throw new Error("Network access requires allowNetwork: true.");
  const requestedHost = new URL(input.url).hostname.toLowerCase();
  const declared = [metadata.sourceUrl, metadata.documentationUrl, metadata.officialLookupUrl, metadata.agency.url].filter((value): value is string => Boolean(value)).map((value) => new URL(value).hostname.toLowerCase());
  if (["localhost", "127.0.0.1", "::1"].includes(requestedHost)) declared.push(requestedHost);
  const downloaded = await downloadOfficialSource(input.url, { ...input.download, allowedHosts: [...new Set(declared)], signal });
  setDownloaded(downloaded);
  return {
    streamOptions: { filePath: downloaded.filePath, sourceUrl: downloaded.metadata.sourceUrl, fetchedAt: downloaded.metadata.fetchedAt, sourceLastModifiedAt: downloaded.metadata.lastModifiedAt },
    sha256: downloaded.metadata.sha256 ?? await hashFile(downloaded.filePath, signal),
  };
}

function checkpointImportRun(cache: OpenTradeSqliteCache, id: string, lastProcessedRow: number, stats: ImportStats, warningCount: number, errorCount: number): void {
  cache.checkpointImportRun(id, {
    lastProcessedRow,
    rawRecordCount: stats.rawRecordCount,
    normalizedRecordCount: stats.normalizedRecordCount,
    duplicateRecordCount: stats.duplicateRecordCount,
    warningCount,
    errorCount,
  });
}

async function hashFile(filePath: string, signal?: AbortSignal): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath, { signal })) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function unavailableResult(options: Pick<RegistryVerifyOptions, "sourceId" | "licenseNumber">, checkedAt: string, code: string, message: string, jurisdiction = "unknown"): TradeLicenseVerificationResult {
  return { sourceId: options.sourceId, jurisdiction, query: { licenseNumber: options.licenseNumber }, result: "source_unavailable", warnings: [], reasons: [{ code, message }], checkedAt };
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
