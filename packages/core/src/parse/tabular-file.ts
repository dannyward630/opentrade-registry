import { extname } from "node:path";
import ExcelJS from "exceljs";

export async function* streamTabularFileRows(filePath: string): AsyncIterable<string[]> {
  const extension = extname(filePath).toLowerCase();
  if (extension !== ".xlsx") {
    throw new Error(`Unsupported tabular file extension: ${extension || "(none)"}.`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("XLSX file does not contain a worksheet.");
  }

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values: string[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) {
      values.push(cellValueToString(row.getCell(column).value));
    }
    yield values;
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
