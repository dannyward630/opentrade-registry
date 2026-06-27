import { extname } from "node:path";
import ExcelJS from "exceljs";

export async function* streamTabularFileRows(filePath: string): AsyncIterable<string[]> {
  const extension = extname(filePath).toLowerCase();
  if (extension !== ".xlsx") {
    throw new Error(`Unsupported tabular file extension: ${extension || "(none)"}.`);
  }

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    hyperlinks: "cache",
    sharedStrings: "cache",
    styles: "cache",
    worksheets: "emit",
  });

  for await (const worksheet of workbook) {
    for await (const row of worksheet) {
      const values: string[] = [];
      for (let column = 1; column <= row.cellCount; column += 1) {
        values.push(cellValueToString(row.getCell(column).value));
      }
      yield values;
    }
    return;
  }
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if ("result" in value) {
    return cellValueToString(value.result ?? "");
  }
  if ("richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  if ("text" in value) {
    return value.text;
  }
  if ("error" in value) {
    return value.error;
  }
  return String(value);
}
