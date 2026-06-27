import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { finished } from "node:stream/promises";

export async function* streamTextFileLines(filePath: string): AsyncIterable<string> {
  const fileStream = createReadStream(filePath, "utf8");
  const lineReader = createInterface({ input: fileStream, crlfDelay: Infinity });

  try {
    for await (const line of lineReader) {
      yield line;
    }
  } finally {
    lineReader.close();
    fileStream.destroy();
    await finished(fileStream).catch(() => undefined);
  }
}
