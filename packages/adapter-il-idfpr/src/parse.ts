import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, parseCsvLine, type RawSourceRecord } from "@opentrade/core";
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
        header = parseIllinoisIdfprCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseIllinoisIdfprCsvRow(trimmedLine, header);
      yield {
        sourceId: IL_IDFPR_ROOFING_CONTRACTORS_SOURCE_ID,
        sourceUrl: input.sourceUrl,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildIllinoisIdfprWarnings(record),
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
  for (const column of IL_IDFPR_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Illinois IDFPR CSV is missing required column: ${column}.`);
    }
  }
}
