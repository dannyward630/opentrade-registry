import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, parseCsvLine, type RawSourceRecord } from "@opentrade/core";
import { OR_CCB_ACTIVE_LICENSES_SOURCE_ID } from "./constants.js";
import { mapOregonCcbFields, OR_CCB_COLUMNS, type OregonCcbRow } from "./map.js";
import { buildOregonCcbWarnings } from "./normalize.js";

export function parseOregonCcbCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseOregonCcbCsvRow(line: string, header: string[] = [...OR_CCB_COLUMNS]): OregonCcbRow {
  return mapOregonCcbFields(parseOregonCcbCsvLine(line), header);
}

export async function* streamOregonCcbCsvFile(input: {
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
        header = parseOregonCcbCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseOregonCcbCsvRow(trimmedLine, header);
      yield {
        sourceId: OR_CCB_ACTIVE_LICENSES_SOURCE_ID,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildOregonCcbWarnings(record),
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
  for (const column of OR_CCB_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Oregon CCB CSV is missing required column: ${column}.`);
    }
  }
}
