import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, parseCsvLine, type RawSourceRecord } from "@opentrade/core";
import { MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID } from "./constants.js";
import { mapMinnesotaDliFields, MN_DLI_COLUMNS, type MinnesotaDliRow } from "./map.js";
import { buildMinnesotaDliWarnings } from "./normalize.js";

export function parseMinnesotaDliCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseMinnesotaDliCsvRow(line: string, header: string[] = [...MN_DLI_COLUMNS]): MinnesotaDliRow {
  return mapMinnesotaDliFields(parseMinnesotaDliCsvLine(line), header);
}

export async function* streamMinnesotaDliCsvFile(input: {
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
        header = parseMinnesotaDliCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseMinnesotaDliCsvRow(trimmedLine, header);
      yield {
        sourceId: MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
        sourceUrl: input.sourceUrl,
        record,
        rowNumber,
        fetchedAt,
        sourceLastModifiedAt: input.sourceLastModifiedAt ?? null,
        fingerprint: buildFingerprint(record.raw),
        warnings: buildMinnesotaDliWarnings(record),
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
  for (const column of MN_DLI_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Minnesota DLI CSV is missing required column: ${column}.`);
    }
  }
}
