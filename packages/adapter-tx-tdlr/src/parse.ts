import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, type RawSourceRecord } from "@opentrade/core";
import { TX_TDLR_ALL_LICENSES_SOURCE_ID } from "./constants.js";
import { mapTexasTdlrFields, TDLR_COLUMNS, type TexasTdlrRow } from "./map.js";
import { buildTexasTdlrWarnings } from "./normalize.js";

export function parseTexasTdlrCsvLine(line: string): string[] {
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

export function parseTexasTdlrCsvRow(line: string, header: string[] = [...TDLR_COLUMNS]): TexasTdlrRow {
  return mapTexasTdlrFields(parseTexasTdlrCsvLine(line), header);
}

export async function* streamTexasTdlrCsvFile(input: {
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
  let header: string[] | null = null;

  try {
    for await (const line of lineReader) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }

      if (!header) {
        header = parseTexasTdlrCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseTexasTdlrCsvRow(trimmedLine, header);
      yield {
        sourceId: TX_TDLR_ALL_LICENSES_SOURCE_ID,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildTexasTdlrWarnings(record),
      };

      if (input.limit && rowNumber >= input.limit) {
        break;
      }
    }
  } finally {
    lineReader.close();
  }
}

function validateHeader(header: string[]): void {
  for (const column of TDLR_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Texas TDLR CSV is missing required column: ${column}.`);
    }
  }
}
