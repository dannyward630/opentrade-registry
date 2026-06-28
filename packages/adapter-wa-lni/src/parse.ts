import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade/core";
import { WA_LNI_CONTRACTORS_SOURCE_ID } from "./constants.js";
import { mapWashingtonLniFields, WA_LNI_COLUMNS, type WashingtonLniRow } from "./map.js";
import { buildWashingtonLniWarnings } from "./normalize.js";

export function parseWashingtonLniCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseWashingtonLniCsvRow(line: string, header: string[] = [...WA_LNI_COLUMNS]): WashingtonLniRow {
  return mapWashingtonLniFields(parseWashingtonLniCsvLine(line), header);
}

export async function* streamWashingtonLniCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({ ...input, sourceId: WA_LNI_CONTRACTORS_SOURCE_ID, header: "first_row", validateHeader, mapFields: mapWashingtonLniFields, rawRecord: (record) => record.raw, warnings: buildWashingtonLniWarnings });
}

function validateHeader(header: string[]): void {
  for (const column of WA_LNI_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Washington L&I CSV is missing required column: ${column}.`);
    }
  }
}
