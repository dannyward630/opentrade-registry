import { resolve } from "node:path";
import {
  canonicalTradeLicenseRecordSchema,
  normalizeLicenseNumber,
  type AdapterError,
  type AdapterWarning,
  type CanonicalTradeLicenseRecord,
  type ImportStats,
  type TradeLicenseSourceAdapter,
  type TradeLicenseVerificationResult,
  type VerificationWarning,
} from "@opentrade/core";
import type { OpenTradeSqliteCache } from "@opentrade/storage-sqlite";
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
};

export type RegistrySyncOptions = {
  sourceId: string;
  input: Exclude<RegistryInput, { mode: "cache" }>;
  strict?: boolean;
  collectRecords?: boolean;
  cache?: OpenTradeSqliteCache;
  importRunId?: string;
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
    const stats: ImportStats = { sourceId: options.sourceId, startedAt, rawRecordCount: 0, normalizedRecordCount: 0, warningCount: 0, errorCount: 0 };
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
    try {
      const streamOptions = await resolveStreamInput(metadata, options.input, options.signal, (value) => { cleanupDownload = value.cleanup; });
      if (options.cache) {
        options.cache.beginImport();
        cacheTransactionActive = true;
      }
      const onStreamError = (error: AdapterError) => {
        errors.push(error);
        if (options.strict) throw new Error(error.message);
      };
      for await (const raw of adapter.streamRawRecords({ ...streamOptions, signal: options.signal, strict: options.strict, onError: onStreamError })) {
        options.signal?.throwIfAborted();
        stats.rawRecordCount += 1;
        warnings.push(...(raw.warnings ?? []));
        let record: CanonicalTradeLicenseRecord;
        try {
          record = canonicalTradeLicenseRecordSchema.parse(await adapter.normalize(raw));
        } catch (error) {
          const item = { code: "record_normalization_failed", message: `Failed to normalize record ${raw.rowNumber ?? "unknown"}: ${errorMessage(error)}`, cause: error, rowNumber: raw.rowNumber, recordFingerprint: raw.fingerprint };
          errors.push(item);
          if (options.strict) throw error;
          continue;
        }
        stats.normalizedRecordCount += 1;
        if (options.collectRecords) records.push(record);
        options.cache?.importRecord(record, { importRunId: options.importRunId, retainedUntil: options.retainedUntil });
        await options.onRecord?.(record);
      }
      stats.warningCount = warnings.length;
      stats.errorCount = errors.length;
      stats.finishedAt = new Date().toISOString();
      if (options.cache) {
        options.cache.commitImport();
        cacheTransactionActive = false;
      }
      await options.cache?.save();
      return { status: "completed", sourceId: options.sourceId, adapterMaturity: metadata.adapterMaturity, stats, warnings, errors, records: options.collectRecords ? records : undefined };
    } catch (error) {
      if (cacheTransactionActive) {
        options.cache?.rollbackImport();
        cacheTransactionActive = false;
      }
      stats.warningCount = warnings.length;
      stats.errorCount = errors.length + 1;
      stats.finishedAt = new Date().toISOString();
      errors.push({ code: "sync_failed", message: errorMessage(error), cause: error });
      return { status: "failed", sourceId: options.sourceId, adapterMaturity: metadata.adapterMaturity, stats, warnings, errors, records: options.collectRecords ? records : undefined };
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
      const streamOptions = await resolveStreamInput(metadata, options.input, options.signal, (value) => { cleanupDownload = value.cleanup; });
      const candidates: CanonicalTradeLicenseRecord[] = [];
      const warnings: VerificationWarning[] = [];
      const onStreamError = (error: AdapterError) => {
        warnings.push({ code: error.code, message: error.message, rowNumber: error.rowNumber, recordFingerprint: error.recordFingerprint });
      };
      for await (const raw of adapter.streamRawRecords({ ...streamOptions, signal: options.signal, onError: onStreamError })) {
        options.signal?.throwIfAborted();
        warnings.push(...(raw.warnings ?? []).map((warning) => ({ ...warning, rowNumber: raw.rowNumber, recordFingerprint: warning.recordFingerprint ?? raw.fingerprint })));
        try {
          const record = await adapter.normalize(raw);
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
  if (input.mode === "file") return { filePath: resolve(input.filePath), sourceUrl: input.sourceUrl, fetchedAt: input.fetchedAt, sourceLastModifiedAt: input.sourceLastModifiedAt };
  if (!input.allowNetwork) throw new Error("Network access requires allowNetwork: true.");
  const requestedHost = new URL(input.url).hostname.toLowerCase();
  const declared = [metadata.sourceUrl, metadata.documentationUrl, metadata.officialLookupUrl, metadata.agency.url].filter((value): value is string => Boolean(value)).map((value) => new URL(value).hostname.toLowerCase());
  if (["localhost", "127.0.0.1", "::1"].includes(requestedHost)) declared.push(requestedHost);
  const downloaded = await downloadOfficialSource(input.url, { ...input.download, allowedHosts: [...new Set(declared)], signal });
  setDownloaded(downloaded);
  return { filePath: downloaded.filePath, sourceUrl: downloaded.metadata.sourceUrl, fetchedAt: downloaded.metadata.fetchedAt, sourceLastModifiedAt: downloaded.metadata.lastModifiedAt };
}

function unavailableResult(options: Pick<RegistryVerifyOptions, "sourceId" | "licenseNumber">, checkedAt: string, code: string, message: string, jurisdiction = "unknown"): TradeLicenseVerificationResult {
  return { sourceId: options.sourceId, jurisdiction, query: { licenseNumber: options.licenseNumber }, result: "source_unavailable", warnings: [], reasons: [{ code, message }], checkedAt };
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
