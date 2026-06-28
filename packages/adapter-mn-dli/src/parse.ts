import { extname } from "node:path";
import { buildFingerprint, parseCsvLine, streamMappedCsvRecords, streamTabularFileRows, type AdapterError, type RawSourceRecord } from "@opentrade-registry/core";
import { MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID } from "./constants.js";
import { mapMinnesotaDliFields, MN_DLI_COLUMNS, type MinnesotaDliRow } from "./map.js";
import { buildMinnesotaDliWarnings } from "./normalize.js";

export function parseMinnesotaDliCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseMinnesotaDliCsvRow(line: string, header: string[] = [...MN_DLI_COLUMNS]): MinnesotaDliRow {
  return mapMinnesotaDliFields(parseMinnesotaDliCsvLine(line), header);
}

export async function* streamMinnesotaDliCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({ ...input, sourceId: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID, header: "first_row", validateHeader, mapFields: mapMinnesotaDliFields, rawRecord: (record) => record.raw, warnings: buildMinnesotaDliWarnings });
}

export async function* streamMinnesotaDliFile(input: {
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
    yield* streamMinnesotaDliCsvFile(input);
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
    let record: MinnesotaDliRow;
    try {
      record = mapMinnesotaDliFields(fields, header);
    } catch (cause) {
      if (!input.onError) throw cause;
      input.onError({ code: "row_parse_failed", message: cause instanceof Error ? cause.message : String(cause), cause, rowNumber: physicalRowNumber });
      continue;
    }
    yield {
      sourceId: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
      sourceUrl: input.sourceUrl,
      record,
      rowNumber: physicalRowNumber,
      fetchedAt,
      sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
      fingerprint: buildFingerprint(record.raw),
      warnings: buildMinnesotaDliWarnings(record),
    };
    yielded += 1;
    if (input.limit && yielded >= input.limit) {
      break;
    }
  }
}

function validateHeader(header: string[]): void {
  for (const column of MN_DLI_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Minnesota DLI CSV is missing required column: ${column}.`);
    }
  }
}
