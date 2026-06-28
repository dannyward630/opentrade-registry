import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade/core";
import { TX_TDLR_ALL_LICENSES_SOURCE_ID } from "./constants.js";
import { mapTexasTdlrFields, TDLR_COLUMNS, type TexasTdlrRow } from "./map.js";
import { buildTexasTdlrWarnings } from "./normalize.js";

export function parseTexasTdlrCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseTexasTdlrCsvRow(line: string, header: string[] = [...TDLR_COLUMNS]): TexasTdlrRow {
  return mapTexasTdlrFields(parseTexasTdlrCsvLine(line), header);
}

export async function* streamTexasTdlrCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({ ...input, sourceId: TX_TDLR_ALL_LICENSES_SOURCE_ID, header: "first_row", validateHeader, mapFields: mapTexasTdlrFields, rawRecord: (record) => record.raw, warnings: buildTexasTdlrWarnings });
}

function validateHeader(header: string[]): void {
  for (const column of TDLR_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Texas TDLR CSV is missing required column: ${column}.`);
    }
  }
}
