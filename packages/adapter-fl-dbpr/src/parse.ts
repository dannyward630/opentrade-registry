import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, parseCsvLine, type RawSourceRecord } from "@opentrade/core";
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
  fetchedAt?: string;
  sourceLastModifiedAt?: string | null;
  limit?: number;
}): AsyncIterable<RawSourceRecord> {
  const lineReader = createInterface({
    input: createReadStream(input.filePath, "utf8"),
    crlfDelay: Infinity,
  });
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  let rowNumber = 0;

  try {
    for await (const line of lineReader) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }

      rowNumber += 1;
      const record = parseConstructionCsvRow(trimmedLine);
      yield {
        sourceId: FL_DBPR_CONSTRUCTION_SOURCE_ID,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildDbprRecordWarnings(record),
      };

      if (input.limit && rowNumber >= input.limit) {
        break;
      }
    }
  } finally {
    lineReader.close();
  }
}
