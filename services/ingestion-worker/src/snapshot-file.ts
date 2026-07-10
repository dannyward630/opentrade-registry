import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export type SnapshotFileInspection = {
  filePath: string;
  sha256: string;
  bytes: number;
};

export async function inspectSnapshotFile(input: {
  filePath: string;
  allowedRoot: string;
  maxBytes: number;
  signal?: AbortSignal;
}): Promise<SnapshotFileInspection> {
  if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 1) throw new Error("Snapshot maxBytes must be a positive safe integer.");
  input.signal?.throwIfAborted();

  const [allowedRoot, filePath] = await Promise.all([
    realpath(resolve(input.allowedRoot)),
    realpath(resolve(input.filePath)),
  ]);
  if (!isWithin(allowedRoot, filePath)) throw new Error("Snapshot file is outside OPENTRADE_SNAPSHOT_ROOT.");

  const file = await stat(filePath);
  if (!file.isFile()) throw new Error("Snapshot path must identify a regular file.");
  if (file.size > input.maxBytes) throw new Error(`Snapshot file exceeds the ${input.maxBytes} byte limit.`);

  const hash = createHash("sha256");
  let bytes = 0;
  const stream = createReadStream(filePath, { signal: input.signal });
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > input.maxBytes) {
      stream.destroy();
      throw new Error(`Snapshot file exceeds the ${input.maxBytes} byte limit.`);
    }
    hash.update(buffer);
  }

  const after = await stat(filePath);
  if (after.size !== file.size || after.mtimeMs !== file.mtimeMs) throw new Error("Snapshot file changed during inspection.");
  return { filePath, sha256: hash.digest("hex"), bytes };
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !path.startsWith(sep));
}
