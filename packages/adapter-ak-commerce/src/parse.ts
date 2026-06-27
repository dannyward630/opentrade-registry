import { buildFingerprint, parseCsvLine, streamTextFileLines, type RawSourceRecord } from "@opentrade/core";
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
        header = parseAlaskaCommerceCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseAlaskaCommerceCsvRow(trimmedLine, header);
      yield {
        sourceId: AK_COMMERCE_CONSTRUCTION_CONTRACTORS_SOURCE_ID,
        sourceUrl: input.sourceUrl,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildAlaskaCommerceWarnings(record),
      };

      if (input.limit && rowNumber >= input.limit) {
        break;
      }
  }
}

function validateHeader(header: string[]): void {
  for (const column of AK_COMMERCE_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Alaska CBPL CSV is missing required column: ${column}.`);
    }
  }
}
