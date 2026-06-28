import { parseCsvLine, streamMappedCsvRecords, type AdapterError, type RawSourceRecord } from "@opentrade/core";
import { AZ_ROC_CONTRACTORS_SOURCE_ID } from "./constants.js";
import { AZ_ROC_COLUMNS, mapArizonaRocFields, type ArizonaRocRow } from "./map.js";
import { buildArizonaRocWarnings } from "./normalize.js";

export function parseArizonaRocCsvLine(line: string): string[] { return parseCsvLine(line); }
export function parseArizonaRocCsvRow(line: string, header: string[] = [...AZ_ROC_COLUMNS]): ArizonaRocRow { return mapArizonaRocFields(parseArizonaRocCsvLine(line), header); }

export async function* streamArizonaRocCsvFile(input: { filePath: string; sourceUrl?: string; fetchedAt?: string; sourceLastModifiedAt?: string | null; limit?: number; signal?: AbortSignal; startAfterRow?: number; onError?: (error: AdapterError) => void }): AsyncIterable<RawSourceRecord> {
  yield* streamMappedCsvRecords({
    ...input,
    sourceId: AZ_ROC_CONTRACTORS_SOURCE_ID,
    header: "first_row",
    validateHeader(header) {
      for (const column of AZ_ROC_COLUMNS) if (!header.includes(column)) throw new Error(`Arizona ROC CSV is missing required column: ${column}.`);
    },
    mapFields: mapArizonaRocFields,
    rawRecord: (record) => record.raw,
    warnings: buildArizonaRocWarnings,
  });
}
