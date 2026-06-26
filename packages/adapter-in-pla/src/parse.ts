import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, parseCsvLine, type RawSourceRecord } from "@opentrade/core";
import { IN_PLA_PROFESSIONAL_LICENSES_SOURCE_ID } from "./constants.js";
import { buildIndianaPlaWarnings } from "./normalize.js";
import { IN_PLA_COLUMNS, mapIndianaPlaFields, type IndianaPlaRow } from "./map.js";

export function parseIndianaPlaCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseIndianaPlaCsvRow(line: string, header: string[] = [...IN_PLA_COLUMNS]): IndianaPlaRow {
  return mapIndianaPlaFields(parseIndianaPlaCsvLine(line), header);
}

export async function* streamIndianaPlaCsvFile(input: {
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
        header = parseIndianaPlaCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseIndianaPlaCsvRow(trimmedLine, header);
      yield {
        sourceId: IN_PLA_PROFESSIONAL_LICENSES_SOURCE_ID,
        sourceUrl: input.sourceUrl,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildIndianaPlaWarnings(record),
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
  for (const column of IN_PLA_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Indiana PLA CSV is missing required column: ${column}.`);
    }
  }
}
