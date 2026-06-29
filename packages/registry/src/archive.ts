import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl, { type Entry, type ZipFile } from "yauzl";

export type SourceArchiveLimits = {
  maxCompressedBytes?: number;
  maxUncompressedBytes?: number;
  maxCompressionRatio?: number;
  maxEntries?: number;
};

export type ExtractedSourceFile = {
  filePath: string;
  cleanup(): Promise<void>;
};

const DEFAULT_LIMITS: Required<SourceArchiveLimits> = {
  maxCompressedBytes: 100 * 1024 * 1024,
  maxUncompressedBytes: 512 * 1024 * 1024,
  maxCompressionRatio: 250,
  maxEntries: 100,
};

export async function extractSingleTabularArchive(
  archivePath: string,
  limits: SourceArchiveLimits = {},
): Promise<ExtractedSourceFile> {
  const effective = { ...DEFAULT_LIMITS, ...limits };
  const compressedBytes = (await stat(archivePath)).size;
  if (compressedBytes > effective.maxCompressedBytes) {
    throw new Error(`Source archive exceeds the ${effective.maxCompressedBytes} compressed byte limit.`);
  }
  const entryName = await inspectArchive(archivePath, effective);
  const directory = await mkdtemp(join(tmpdir(), "opentrade-extracted-"));
  const extension = extname(entryName).toLowerCase();
  const filePath = join(directory, `source${extension}`);
  try {
    await extractEntry(archivePath, entryName, filePath);
    return { filePath, cleanup: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function inspectArchive(archivePath: string, limits: Required<SourceArchiveLimits>): Promise<string> {
  const archive = await openZip(archivePath);
  return new Promise((resolve, reject) => {
    let entries = 0;
    let uncompressedBytes = 0;
    const candidates: string[] = [];
    const fail = (error: Error) => {
      archive.close();
      reject(error);
    };
    archive.on("error", reject);
    archive.on("entry", (entry: Entry) => {
      entries += 1;
      uncompressedBytes += entry.uncompressedSize;
      if (entry.fileName.startsWith("/") || entry.fileName.split("/").includes("..")) return fail(new Error("Source archive contains an unsafe entry path."));
      if (entries > limits.maxEntries) return fail(new Error(`Source archive exceeds the ${limits.maxEntries} entry limit.`));
      if (uncompressedBytes > limits.maxUncompressedBytes) return fail(new Error(`Source archive exceeds the ${limits.maxUncompressedBytes} uncompressed byte limit.`));
      if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > limits.maxCompressionRatio) return fail(new Error(`Source archive entry exceeds the ${limits.maxCompressionRatio}:1 compression ratio limit.`));
      if (!entry.fileName.endsWith("/") && [".csv", ".xlsx"].includes(extname(entry.fileName).toLowerCase())) candidates.push(entry.fileName);
      archive.readEntry();
    });
    archive.on("end", () => {
      if (candidates.length !== 1) return reject(new Error(`Source archive must contain exactly one CSV or XLSX file; found ${candidates.length}.`));
      resolve(candidates[0]!);
    });
    archive.readEntry();
  });
}

async function extractEntry(archivePath: string, entryName: string, outputPath: string): Promise<void> {
  const archive = await openZip(archivePath);
  await new Promise<void>((resolve, reject) => {
    archive.on("error", reject);
    archive.on("entry", (entry: Entry) => {
      if (entry.fileName !== entryName) {
        archive.readEntry();
        return;
      }
      if (basename(entry.fileName) !== basename(entryName)) return reject(new Error("Source archive entry name changed during extraction."));
      archive.openReadStream(entry, (error, stream) => {
        if (error || !stream) return reject(error ?? new Error("Unable to read source archive entry."));
        pipeline(stream, createWriteStream(outputPath)).then(() => {
          archive.close();
          resolve();
        }, reject);
      });
    });
    archive.on("end", () => reject(new Error("Source archive entry disappeared during extraction.")));
    archive.readEntry();
  });
}

function openZip(filePath: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true, autoClose: true, validateEntrySizes: true }, (error, archive) => {
      if (error || !archive) reject(error ?? new Error("Unable to open source archive."));
      else resolve(archive);
    });
  });
}
