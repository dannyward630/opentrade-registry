import { extname } from "node:path";
import { buildFingerprint, parseCsvLine, streamTabularFileRows, streamTextFileLines, type RawSourceRecord } from "@opentrade/core";
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
}): AsyncIterable<RawSourceRecord> {
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  let rowNumber = 0;
  let header: string[] | null = null;

  for await (const line of streamTextFileLines(input.filePath)) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }

      if (!header) {
        header = parseCaliforniaCslbCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseCaliforniaCslbCsvRow(trimmedLine, header);
      yield {
        sourceId: CA_CSLB_CONTRACTORS_SOURCE_ID,
        sourceUrl: input.sourceUrl,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildCaliforniaCslbWarnings(record),
      };

      if (input.limit && rowNumber >= input.limit) {
        break;
      }
  }
}

export async function* streamCaliforniaCslbFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
}): AsyncIterable<RawSourceRecord> {
  if (extname(input.filePath).toLowerCase() !== ".xlsx") {
    yield* streamCaliforniaCslbCsvFile(input);
    return;
  }

  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  let header: string[] | null = null;
  let rowNumber = 0;
  for await (const fields of streamTabularFileRows(input.filePath)) {
    if (!header) {
      header = fields;
      validateHeader(header);
      continue;
    }
    if (fields.every((value) => value.trim() === "")) {
      continue;
    }
    rowNumber += 1;
    const record = mapCaliforniaCslbFields(fields, header);
    yield {
      sourceId: CA_CSLB_CONTRACTORS_SOURCE_ID,
      sourceUrl: input.sourceUrl,
      record,
      rowNumber,
      fetchedAt,
      sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
      fingerprint: buildFingerprint(record.raw),
      warnings: buildCaliforniaCslbWarnings(record),
    };
    if (input.limit && rowNumber >= input.limit) {
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
