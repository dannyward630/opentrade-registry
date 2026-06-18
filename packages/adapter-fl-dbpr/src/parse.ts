import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, type RawSourceRecord } from "@opentrade/core";
import { FL_DBPR_CONSTRUCTION_SOURCE_ID } from "./constants.js";
import { mapConstructionCsvFields, type DbprConstructionRow } from "./map.js";
import { buildDbprRecordWarnings } from "./normalize.js";

export function parseConstructionCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\"") {
      const nextCharacter = line[index + 1];
      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
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
