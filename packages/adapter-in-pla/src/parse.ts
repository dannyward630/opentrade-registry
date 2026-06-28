import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade/core";
import { IN_PLA_PROFESSIONAL_LICENSES_SOURCE_ID } from "./constants.js";
import { buildIndianaPlaWarnings } from "./normalize.js";
import { IN_PLA_COLUMNS, mapIndianaPlaFields, type IndianaPlaRow } from "./map.js";

export function parseIndianaPlaCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseIndianaPlaCsvRow(line: string, header: string[] = [...IN_PLA_COLUMNS]): IndianaPlaRow {
  return mapIndianaPlaFields(parseIndianaPlaCsvLine(line), header);
}

export async function* streamIndianaPlaCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({ ...input, sourceId: IN_PLA_PROFESSIONAL_LICENSES_SOURCE_ID, header: "first_row", validateHeader, mapFields: mapIndianaPlaFields, rawRecord: (record) => record.raw, warnings: buildIndianaPlaWarnings });
}

function validateHeader(header: string[]): void {
  for (const column of IN_PLA_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Indiana PLA CSV is missing required column: ${column}.`);
    }
  }
}
