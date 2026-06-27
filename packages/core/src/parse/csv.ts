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
