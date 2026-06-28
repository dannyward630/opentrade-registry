import { buildFingerprint } from "../normalize/fingerprint.js";
import { streamCsvFileRows } from "../parse/csv.js";
import type { AdapterError, AdapterWarning, RawSourceRecord } from "./types.js";

export type StreamMappedCsvRecordsOptions<T> = {
  filePath: string;
  sourceId: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
  header: "first_row" | "none";
  defaultHeader?: readonly string[];
  validateHeader?: (header: string[]) => void;
  mapFields: (fields: string[], header: string[]) => T;
  rawRecord: (record: T) => unknown;
  warnings?: (record: T) => AdapterWarning[];
};

export async function* streamMappedCsvRecords<T>(input: StreamMappedCsvRecordsOptions<T>): AsyncIterable<RawSourceRecord> {
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  let header = input.header === "none" ? [...(input.defaultHeader ?? [])] : null;
  let yielded = 0;

  for await (const row of streamCsvFileRows(input.filePath, {
    signal: input.signal,
    onError: input.onError
      ? (error) => input.onError?.({ code: "row_parse_failed", message: error.message, rowNumber: error.rowNumber })
      : undefined,
  })) {
    if (!header) {
      header = row.fields;
      input.validateHeader?.(header);
      continue;
    }
    if (row.rowNumber <= (input.startAfterRow ?? 0)) continue;

    let record: T;
    try {
      record = input.mapFields(row.fields, header);
    } catch (cause) {
      if (!input.onError) throw cause;
      input.onError({
        code: "row_parse_failed",
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
        rowNumber: row.rowNumber,
      });
      continue;
    }

    const raw = input.rawRecord(record);
    yield {
      sourceId: input.sourceId,
      sourceUrl: input.sourceUrl,
      record,
      rowNumber: row.rowNumber,
      fetchedAt,
      sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
      fingerprint: buildFingerprint(raw),
      warnings: input.warnings?.(record),
    };
    yielded += 1;
    if (input.limit && yielded >= input.limit) break;
  }
}
