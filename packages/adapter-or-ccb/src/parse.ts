import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade-registry/core";
import { OR_CCB_ACTIVE_LICENSES_SOURCE_ID } from "./constants.js";
import { mapOregonCcbFields, OR_CCB_COLUMNS, type OregonCcbRow } from "./map.js";
import { buildOregonCcbWarnings } from "./normalize.js";

export function parseOregonCcbCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseOregonCcbCsvRow(line: string, header: string[] = [...OR_CCB_COLUMNS]): OregonCcbRow {
  return mapOregonCcbFields(parseOregonCcbCsvLine(line), header);
}

export async function* streamOregonCcbCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({ ...input, sourceId: OR_CCB_ACTIVE_LICENSES_SOURCE_ID, header: "first_row", validateHeader, mapFields: mapOregonCcbFields, rawRecord: (record) => record.raw, warnings: buildOregonCcbWarnings });
}

function validateHeader(header: string[]): void {
  for (const column of OR_CCB_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Oregon CCB CSV is missing required column: ${column}.`);
    }
  }
}
