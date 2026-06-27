import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { buildFingerprint, parseCsvLine, type RawSourceRecord } from "@opentrade/core";
import { AZ_ROC_CONTRACTORS_SOURCE_ID } from "./constants.js";
import { AZ_ROC_COLUMNS, mapArizonaRocFields, type ArizonaRocRow } from "./map.js";
import { buildArizonaRocWarnings } from "./normalize.js";

export function parseArizonaRocCsvLine(line: string): string[] { return parseCsvLine(line); }
export function parseArizonaRocCsvRow(line: string, header: string[] = [...AZ_ROC_COLUMNS]): ArizonaRocRow { return mapArizonaRocFields(parseArizonaRocCsvLine(line), header); }

export async function* streamArizonaRocCsvFile(input: { filePath: string; sourceUrl?: string; fetchedAt?: string; sourceLastModifiedAt?: string | null; limit?: number }): AsyncIterable<RawSourceRecord> {
  const reader = createInterface({ input: createReadStream(input.filePath, "utf8"), crlfDelay: Infinity });
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  let rowNumber = 0;
  let header: string[] | null = null;
  try {
    for await (const line of reader) {
      if (!line.trim()) continue;
      if (!header) {
        header = parseArizonaRocCsvLine(line.replace(/^\uFEFF/, ""));
        for (const column of AZ_ROC_COLUMNS) if (!header.includes(column)) throw new Error(`Arizona ROC CSV is missing required column: ${column}.`);
        continue;
      }
      rowNumber += 1;
      const record = parseArizonaRocCsvRow(line, header);
      yield { sourceId: AZ_ROC_CONTRACTORS_SOURCE_ID, sourceUrl: input.sourceUrl, record, rowNumber, fetchedAt, sourceLastModifiedAt: input.sourceLastModifiedAt ?? null, fingerprint: buildFingerprint(record.raw), warnings: buildArizonaRocWarnings(record) };
      if (input.limit && rowNumber >= input.limit) break;
    }
  } finally { reader.close(); }
}
