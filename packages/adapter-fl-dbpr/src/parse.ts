import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade-registry/core";
import { FL_DBPR_CONSTRUCTION_SOURCE_ID } from "./constants.js";
import { mapConstructionCsvFields, type DbprConstructionRow } from "./map.js";
import { buildDbprRecordWarnings } from "./normalize.js";

export function parseConstructionCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseConstructionCsvRow(line: string): DbprConstructionRow {
  return mapConstructionCsvFields(parseConstructionCsvLine(line));
}

export async function* streamConstructionCsvFile(input: {
  filePath: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
  signal?: AbortSignal;
  startAfterRow?: number;
  onError?: (error: AdapterError) => void;
}): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({
    ...input,
    sourceId: FL_DBPR_CONSTRUCTION_SOURCE_ID,
    header: "none",
    defaultHeader: [],
    mapFields: (fields) => mapConstructionCsvFields(fields),
    rawRecord: (record) => record.raw,
    warnings: buildDbprRecordWarnings,
  });
}
