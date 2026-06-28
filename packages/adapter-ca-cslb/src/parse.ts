import { extname } from "node:path";
import { buildFingerprint, parseCsvLine, streamMappedCsvRecords, streamTabularFileRows, type AdapterError, type RawSourceRecord } from "@opentrade/core";
import { CA_CSLB_CONTRACTORS_SOURCE_ID } from "./constants.js";
import { CA_CSLB_COLUMNS, mapCaliforniaCslbFields, type CaliforniaCslbRow } from "./map.js";
import { buildCaliforniaCslbWarnings } from "./normalize.js";

export function parseCaliforniaCslbCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseCaliforniaCslbCsvRow(line: string, header: string[] = [...CA_CSLB_COLUMNS]): CaliforniaCslbRow {
  return mapCaliforniaCslbFields(parseCaliforniaCslbCsvLine(line), header);
}

export async function* streamCaliforniaCslbCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({ ...input, sourceId: CA_CSLB_CONTRACTORS_SOURCE_ID, header: "first_row", validateHeader, mapFields: mapCaliforniaCslbFields, rawRecord: (record) => record.raw, warnings: buildCaliforniaCslbWarnings });
}

export async function* streamCaliforniaCslbFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  if (extname(input.filePath).toLowerCase() !== ".xlsx") {
    yield* streamCaliforniaCslbCsvFile(input);
    return;
  }

  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  let header: string[] | null = null;
  let physicalRowNumber = 0;
  let yielded = 0;
  for await (const fields of streamTabularFileRows(input.filePath)) {
    input.signal?.throwIfAborted();
    physicalRowNumber += 1;
    if (!header) {
      header = fields;
      validateHeader(header);
      continue;
    }
    if (fields.every((value) => value.trim() === "")) {
      continue;
    }
    if (physicalRowNumber <= (input.startAfterRow ?? 0)) continue;
    let record: CaliforniaCslbRow;
    try {
      record = mapCaliforniaCslbFields(fields, header);
    } catch (cause) {
      if (!input.onError) throw cause;
      input.onError({ code: "row_parse_failed", message: cause instanceof Error ? cause.message : String(cause), cause, rowNumber: physicalRowNumber });
      continue;
    }
    yield {
      sourceId: CA_CSLB_CONTRACTORS_SOURCE_ID,
      sourceUrl: input.sourceUrl,
      record,
      rowNumber: physicalRowNumber,
      fetchedAt,
      sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
      fingerprint: buildFingerprint(record.raw),
      warnings: buildCaliforniaCslbWarnings(record),
    };
    yielded += 1;
    if (input.limit && yielded >= input.limit) {
      break;
    }
  }
}

function validateHeader(header: string[]): void {
  for (const column of CA_CSLB_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`California CSLB CSV is missing required column: ${column}.`);
    }
  }
}
