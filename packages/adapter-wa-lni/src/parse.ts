import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, parseCsvLine, type RawSourceRecord } from "@opentrade/core";
import { WA_LNI_CONTRACTORS_SOURCE_ID } from "./constants.js";
import { mapWashingtonLniFields, WA_LNI_COLUMNS, type WashingtonLniRow } from "./map.js";
import { buildWashingtonLniWarnings } from "./normalize.js";

export function parseWashingtonLniCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseWashingtonLniCsvRow(line: string, header: string[] = [...WA_LNI_COLUMNS]): WashingtonLniRow {
  return mapWashingtonLniFields(parseWashingtonLniCsvLine(line), header);
}

export async function* streamWashingtonLniCsvFile(input: {
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
        header = parseWashingtonLniCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseWashingtonLniCsvRow(trimmedLine, header);
      yield {
        sourceId: WA_LNI_CONTRACTORS_SOURCE_ID,
        sourceUrl: input.sourceUrl,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildWashingtonLniWarnings(record),
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
  for (const column of WA_LNI_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Washington L&I CSV is missing required column: ${column}.`);
    }
  }
}
