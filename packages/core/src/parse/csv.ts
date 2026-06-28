import { streamTextFileLines } from "./lines.js";

export type CsvFileRow = {
  fields: string[];
  line: string;
  rowNumber: number;
};

export type CsvRowError = {
  rowNumber: number;
  message: string;
};

export type StreamCsvFileRowsOptions = {
  onError?: (error: CsvRowError) => void;
  signal?: AbortSignal;
};

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  let quotedFieldClosed = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\"") {
      const nextCharacter = line[index + 1];
      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
        continue;
      }
      if (inQuotes) {
        inQuotes = false;
        quotedFieldClosed = true;
      } else if (current.length === 0 && !quotedFieldClosed) {
        inQuotes = true;
      } else {
        throw new Error(`Malformed CSV: unexpected quote at character ${index + 1}.`);
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      quotedFieldClosed = false;
      continue;
    }

    if (quotedFieldClosed) {
      throw new Error(`Malformed CSV: unexpected character after closing quote at character ${index + 1}.`);
    }

    current += character;
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field.");
  }

  values.push(current);
  return values;
}

export async function* streamCsvFileRows(filePath: string, options: StreamCsvFileRowsOptions = {}): AsyncIterable<CsvFileRow> {
  let rowNumber = 0;
  for await (const line of streamTextFileLines(filePath)) {
    options.signal?.throwIfAborted();
    rowNumber += 1;
    if (!line.trim()) continue;
    try {
      yield { fields: parseCsvLine(line.replace(/^\uFEFF/, "")), line, rowNumber };
    } catch (cause) {
      if (!options.onError) throw cause;
      options.onError({ rowNumber, message: cause instanceof Error ? cause.message : String(cause) });
    }
  }
}
