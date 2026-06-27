import { buildFingerprint, parseCsvLine, streamTextFileLines, type RawSourceRecord } from "@opentrade/core";
import { TX_TDLR_ALL_LICENSES_SOURCE_ID } from "./constants.js";
import { mapTexasTdlrFields, TDLR_COLUMNS, type TexasTdlrRow } from "./map.js";
import { buildTexasTdlrWarnings } from "./normalize.js";

export function parseTexasTdlrCsvLine(line: string): string[] {
  return parseCsvLine(line);
}

export function parseTexasTdlrCsvRow(line: string, header: string[] = [...TDLR_COLUMNS]): TexasTdlrRow {
  return mapTexasTdlrFields(parseTexasTdlrCsvLine(line), header);
}

export async function* streamTexasTdlrCsvFile(input: {
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
        header = parseTexasTdlrCsvLine(trimmedLine);
        validateHeader(header);
        continue;
      }

      rowNumber += 1;
      const record = parseTexasTdlrCsvRow(trimmedLine, header);
      yield {
        sourceId: TX_TDLR_ALL_LICENSES_SOURCE_ID,
        sourceUrl: input.sourceUrl,
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
}

function validateHeader(header: string[]): void {
  for (const column of TDLR_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`Texas TDLR CSV is missing required column: ${column}.`);
    }
  }
}
