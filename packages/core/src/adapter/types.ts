import type { CanonicalTradeLicenseRecord, SourceRegistryEntry } from "../schema/index.js";

export type SourceAvailability = {
  ok: boolean;
  checkedAt: string;
  statusCode?: number;
  message?: string;
  warnings?: AdapterWarning[];
};

export type RemoteSnapshotMetadata = {
  fetchedAt: string;
  sourceUrl: string;
  originalSourceUrl?: string | null;
  lastModifiedAt?: string | null;
  etag?: string | null;
  contentLength?: number | null;
  contentType?: string | null;
  sha256?: string | null;
};

export type StreamRecordsOptions = {
  filePath?: string;
  sourceUrl?: string;
  sourceLastModifiedAt?: string | null;
  fetchedAt?: string;
  limit?: number;
  signal?: AbortSignal;
};

export type RawSourceRecord = {
  sourceId: string;
  sourceUrl?: string;
  record: unknown;
  rowNumber?: number;
  fetchedAt: string;
  sourceLastModifiedAt?: string | null;
  fingerprint: string;
  warnings?: AdapterWarning[];
};

export type LicenseLookupQuery = {
  licenseNumber?: string;
  state?: string;
  businessName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
};

export type LicenseLookupResult = {
  sourceId: string;
  query: LicenseLookupQuery;
  result: "not_found" | "matched" | "ambiguous" | "source_unavailable" | "invalid_input";
  records: CanonicalTradeLicenseRecord[];
  warnings: AdapterWarning[];
  errors: AdapterError[];
  checkedAt: string;
};

export type AdapterWarning = {
  code: string;
  message: string;
  recordFingerprint?: string;
};

export type AdapterError = {
  code: string;
  message: string;
  cause?: unknown;
  recordFingerprint?: string;
};

export type ImportStats = {
  sourceId: string;
  startedAt: string;
  finishedAt?: string;
  rawRecordCount: number;
  normalizedRecordCount: number;
  warningCount: number;
  errorCount: number;
};

export interface TradeLicenseSourceAdapter {
  sourceId: string;
  getSourceMetadata(): Promise<SourceRegistryEntry>;
  checkAvailability(): Promise<SourceAvailability>;
  getRemoteSnapshotMetadata?(): Promise<RemoteSnapshotMetadata>;
  streamRawRecords(options: StreamRecordsOptions): AsyncIterable<RawSourceRecord>;
  normalize(raw: RawSourceRecord): Promise<CanonicalTradeLicenseRecord>;
  lookupLicense?(query: LicenseLookupQuery): Promise<LicenseLookupResult>;
}
