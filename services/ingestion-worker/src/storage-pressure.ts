import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, statfs, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";

const maxStatusBytes = 8 * 1024;

export const storagePressureStatusSchema = z.object({
  schemaVersion: z.literal("1.0"),
  path: z.string().min(1),
  status: z.enum(["healthy", "warning", "critical"]),
  totalBytes: z.string().regex(/^[1-9][0-9]*$/),
  availableBytes: z.string().regex(/^(0|[1-9][0-9]*)$/),
  freePercent: z.number().finite().min(0).max(100),
  warningFreePercent: z.number().finite().gt(0).lt(100),
  stopFreePercent: z.number().finite().gt(0).lt(100),
  checkedAt: z.string().datetime(),
}).superRefine((value, context) => {
  if (value.stopFreePercent >= value.warningFreePercent) {
    context.addIssue({ code: "custom", path: ["stopFreePercent"], message: "Stop threshold must be below warning threshold." });
  }
  if (BigInt(value.availableBytes) > BigInt(value.totalBytes)) {
    context.addIssue({ code: "custom", path: ["availableBytes"], message: "Available bytes cannot exceed total bytes." });
  }
  const expected = classifyStoragePressure(value.freePercent, value.warningFreePercent, value.stopFreePercent);
  if (value.status !== expected) {
    context.addIssue({ code: "custom", path: ["status"], message: `Status must be ${expected} for the measured free percentage.` });
  }
});

export type StoragePressureStatus = z.infer<typeof storagePressureStatusSchema>;

export type StoragePressureThresholds = {
  warningFreePercent: number;
  stopFreePercent: number;
};

export type InspectStoragePressureOptions = StoragePressureThresholds & {
  path: string;
  now?: () => string;
  inspectFileSystem?: (path: string) => Promise<{ blockSize: bigint; blocks: bigint; availableBlocks: bigint }>;
};

export class StoragePressureAdmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoragePressureAdmissionError";
  }
}

export async function inspectStoragePressure(options: InspectStoragePressureOptions): Promise<StoragePressureStatus> {
  validateThresholds(options);
  const measured = await (options.inspectFileSystem ?? inspectFileSystem)(options.path);
  if (measured.blockSize <= 0n || measured.blocks <= 0n || measured.availableBlocks < 0n) {
    throw new Error("Storage filesystem returned invalid capacity values.");
  }
  const totalBytes = measured.blockSize * measured.blocks;
  const availableBytes = measured.blockSize * measured.availableBlocks;
  if (availableBytes > totalBytes) throw new Error("Storage filesystem reported more available bytes than total bytes.");
  const freePercent = Number(availableBytes) / Number(totalBytes) * 100;
  if (!Number.isFinite(freePercent)) throw new Error("Storage free percentage could not be calculated.");

  return storagePressureStatusSchema.parse({
    schemaVersion: "1.0",
    path: options.path,
    status: classifyStoragePressure(freePercent, options.warningFreePercent, options.stopFreePercent),
    totalBytes: totalBytes.toString(),
    availableBytes: availableBytes.toString(),
    freePercent,
    warningFreePercent: options.warningFreePercent,
    stopFreePercent: options.stopFreePercent,
    checkedAt: (options.now ?? (() => new Date().toISOString()))(),
  });
}

export async function writeStoragePressureStatus(filePath: string, status: StoragePressureStatus): Promise<void> {
  const validated = storagePressureStatusSchema.parse(status);
  const directory = dirname(filePath);
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o755 });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(validated)}\n`, { encoding: "utf8", flag: "wx", mode: 0o644 });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readStoragePressureStatus(input: {
  filePath: string;
  maxAgeMs: number;
  warningFreePercent: number;
  stopFreePercent: number;
  now?: () => number;
  maxFutureSkewMs?: number;
}): Promise<StoragePressureStatus> {
  validateThresholds(input);
  if (!Number.isSafeInteger(input.maxAgeMs) || input.maxAgeMs < 1) throw new Error("Storage status max age must be a positive safe integer.");
  const file = await lstat(input.filePath);
  if (!file.isFile() || file.isSymbolicLink()) throw new StoragePressureAdmissionError("Storage health status must be a regular file.");
  if (file.size > maxStatusBytes) throw new StoragePressureAdmissionError(`Storage health status exceeds ${maxStatusBytes} bytes.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(input.filePath, "utf8"));
  } catch {
    throw new StoragePressureAdmissionError("Storage health status is not valid JSON.");
  }
  const result = storagePressureStatusSchema.safeParse(parsed);
  if (!result.success) throw new StoragePressureAdmissionError("Storage health status does not match the required schema.");
  const status = result.data;
  if (status.warningFreePercent !== input.warningFreePercent || status.stopFreePercent !== input.stopFreePercent) {
    throw new StoragePressureAdmissionError("Storage health thresholds do not match the ingestion configuration.");
  }

  const now = (input.now ?? Date.now)();
  const checkedAt = Date.parse(status.checkedAt);
  const maxFutureSkewMs = input.maxFutureSkewMs ?? 5_000;
  if (checkedAt > now + maxFutureSkewMs) throw new StoragePressureAdmissionError("Storage health status has a future timestamp.");
  if (now - checkedAt > input.maxAgeMs) throw new StoragePressureAdmissionError("Storage health status is stale.");
  return status;
}

export async function assertStorageAdmission(input: Parameters<typeof readStoragePressureStatus>[0]): Promise<StoragePressureStatus> {
  let status: StoragePressureStatus;
  try {
    status = await readStoragePressureStatus(input);
  } catch (error) {
    if (error instanceof StoragePressureAdmissionError) throw error;
    throw new StoragePressureAdmissionError(`Storage health status is unavailable: ${errorMessage(error)}`);
  }
  if (status.status === "critical") {
    throw new StoragePressureAdmissionError(
      `Snapshot storage has ${formatPercent(status.freePercent)}% free, below the ${formatPercent(status.stopFreePercent)}% ingestion stop threshold.`,
    );
  }
  return status;
}

export async function runStoragePressureMonitor(options: InspectStoragePressureOptions & {
  statusFilePath: string;
  intervalMs: number;
  signal: AbortSignal;
  onStatus?: (status: StoragePressureStatus) => void;
  onError?: (error: Error) => void;
  inspect?: typeof inspectStoragePressure;
  write?: typeof writeStoragePressureStatus;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}): Promise<void> {
  if (!Number.isSafeInteger(options.intervalMs) || options.intervalMs < 1) throw new Error("Storage monitor interval must be a positive safe integer.");
  while (!options.signal.aborted) {
    try {
      const status = await (options.inspect ?? inspectStoragePressure)(options);
      await (options.write ?? writeStoragePressureStatus)(options.statusFilePath, status);
      options.onStatus?.(status);
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
    if (options.signal.aborted) break;
    try {
      await (options.wait ?? waitForInterval)(options.intervalMs, options.signal);
    } catch (error) {
      if (!options.signal.aborted) throw error;
    }
  }
}

export function classifyStoragePressure(freePercent: number, warningFreePercent: number, stopFreePercent: number): StoragePressureStatus["status"] {
  validateThresholds({ warningFreePercent, stopFreePercent });
  if (!Number.isFinite(freePercent) || freePercent < 0 || freePercent > 100) throw new Error("Storage free percentage must be between 0 and 100.");
  if (freePercent < stopFreePercent) return "critical";
  if (freePercent < warningFreePercent) return "warning";
  return "healthy";
}

function validateThresholds(value: StoragePressureThresholds): void {
  if (!Number.isFinite(value.stopFreePercent) || !Number.isFinite(value.warningFreePercent)
    || value.stopFreePercent <= 0 || value.warningFreePercent >= 100
    || value.stopFreePercent >= value.warningFreePercent) {
    throw new Error("Storage thresholds must satisfy 0 < stop < warning < 100.");
  }
}

async function inspectFileSystem(path: string): Promise<{ blockSize: bigint; blocks: bigint; availableBlocks: bigint }> {
  const result = await statfs(path, { bigint: true });
  return { blockSize: result.bsize, blocks: result.blocks, availableBlocks: result.bavail };
}

async function waitForInterval(milliseconds: number, signal: AbortSignal): Promise<void> {
  await sleep(milliseconds, undefined, { signal });
}

function formatPercent(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
