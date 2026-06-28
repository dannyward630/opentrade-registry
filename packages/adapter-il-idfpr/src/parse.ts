import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade-registry/core";
import { IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID } from "./constants.js";
import { IL_IDFPR_COLUMNS, mapIllinoisIdfprFields, type IllinoisIdfprRow } from "./map.js";
import { buildIllinoisIdfprWarnings } from "./normalize.js";

export function parseIllinoisIdfprCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseIllinoisIdfprCsvRow(line: string, header: string[] = [...IL_IDFPR_COLUMNS]): IllinoisIdfprRow {
  return mapIllinoisIdfprFields(parseIllinoisIdfprCsvLine(line), header);
}

export async function* streamIllinoisIdfprCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({ ...input, sourceId: IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID, header: "first_row", validateHeader, mapFields: mapIllinoisIdfprFields, rawRecord: (record) => record.raw, warnings: buildIllinoisIdfprWarnings });
}

function validateHeader(header: string[]): void {
  for (const column of IL_IDFPR_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Illinois IDFPR CSV is missing required column: ${column}.`);
    }
  }
}
