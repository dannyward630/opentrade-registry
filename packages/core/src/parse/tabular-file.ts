import { extname } from "node:path";
import { stat } from "node:fs/promises";
import ExcelJS from "exceljs";
import yauzl from "yauzl";

export type TabularFileLimits = {
  maxCompressedBytes?: number;
  maxUncompressedBytes?: number;
  maxCompressionRatio?: number;
  maxEntries?: number;
  maxRows?: number;
  maxColumns?: number;
};

const DEFAULT_LIMITS: Required<TabularFileLimits> = {
  maxCompressedBytes: 100 * 1024 * 1024,
  maxUncompressedBytes: 512 * 1024 * 1024,
  maxCompressionRatio: 250,
  maxEntries: 10_000,
  maxRows: 2_000_000,
  maxColumns: 10_000,
};

export async function* streamTabularFileRows(filePath: string, limits: TabularFileLimits = {}): AsyncIterable<string[]> {
  const extension = extname(filePath).toLowerCase();
  if (extension !== ".xlsx") {
    throw new Error(`Unsupported tabular file extension: ${extension || "(none)"}.`);
  }

  const effectiveLimits = { ...DEFAULT_LIMITS, ...limits };
  await validateXlsxArchive(filePath, effectiveLimits);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("XLSX file does not contain a worksheet.");
  }
  if (worksheet.rowCount > effectiveLimits.maxRows) throw new Error(`XLSX worksheet exceeds the ${effectiveLimits.maxRows} row limit.`);
  if (worksheet.columnCount > effectiveLimits.maxColumns) throw new Error(`XLSX worksheet exceeds the ${effectiveLimits.maxColumns} column limit.`);

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (row.cellCount > effectiveLimits.maxColumns) throw new Error(`XLSX row ${rowNumber} exceeds the ${effectiveLimits.maxColumns} column limit.`);
    const values: string[] = [];
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      values.push(cellValueToString(row.getCell(column).value));
    }
    yield values;
  }
}

async function validateXlsxArchive(filePath: string, limits: Required<TabularFileLimits>): Promise<void> {
  const fileSize = (await stat(filePath)).size;
  if (fileSize > limits.maxCompressedBytes) throw new Error(`XLSX file exceeds the ${limits.maxCompressedBytes} compressed byte limit.`);
  const archive = await openZip(filePath);
  await new Promise<void>((resolvePromise, rejectPromise) => {
    let entries = 0;
    let uncompressedBytes = 0;
    const fail = (error: Error) => {
      archive.close();
      rejectPromise(error);
    };
    archive.on("error", rejectPromise);
    archive.on("end", resolvePromise);
    archive.on("entry", (entry) => {
      entries += 1;
      uncompressedBytes += entry.uncompressedSize;
      if (entry.fileName.startsWith("/") || entry.fileName.split("/").includes("..")) return fail(new Error("XLSX archive contains an unsafe entry path."));
      if (entries > limits.maxEntries) return fail(new Error(`XLSX archive exceeds the ${limits.maxEntries} entry limit.`));
      if (uncompressedBytes > limits.maxUncompressedBytes) return fail(new Error(`XLSX archive exceeds the ${limits.maxUncompressedBytes} uncompressed byte limit.`));
      if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > limits.maxCompressionRatio) return fail(new Error(`XLSX archive entry exceeds the ${limits.maxCompressionRatio}:1 compression ratio limit.`));
      archive.readEntry();
    });
    archive.readEntry();
  });
}

function openZip(filePath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolvePromise, rejectPromise) => {
    yauzl.open(filePath, { lazyEntries: true, autoClose: true, validateEntrySizes: true }, (error, archive) => {
      if (error || !archive) rejectPromise(error ?? new Error("Unable to open XLSX archive."));
      else resolvePromise(archive);
    });
  });
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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
