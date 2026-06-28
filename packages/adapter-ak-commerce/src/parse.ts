import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade/core";
import { AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID } from "./constants.js";
import { AK_COMMERCE_COLUMNS, mapAlaskaCommerceFields, type AlaskaCommerceRow } from "./map.js";
import { buildAlaskaCommerceWarnings } from "./normalize.js";

export function parseAlaskaCommerceCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseAlaskaCommerceCsvRow(line: string, header: string[] = [...AK_COMMERCE_COLUMNS]): AlaskaCommerceRow {
  return mapAlaskaCommerceFields(parseAlaskaCommerceCsvLine(line), header);
}

export async function* streamAlaskaCommerceCsvFile(input: {
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
    sourceId: AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID,
    header: "first_row",
    validateHeader,
    mapFields: mapAlaskaCommerceFields,
    rawRecord: (record) => record.raw,
    warnings: buildAlaskaCommerceWarnings,
  });
}

function validateHeader(header: string[]): void {
  for (const column of AK_COMMERCE_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Alaska CBPL CSV is missing required column: ${column}.`);
    }
  }
}
