import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parseArchiveEndpoint, S3SnapshotArchive } from "../services/ingestion-worker/src/archive.js";

describe("snapshot archive", () => {
  it("conditionally writes a missing object and verifies trusted metadata", async () => {
    const filePath = await snapshotFile();
    const send = vi.fn()
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(head());
    const archive = new S3SnapshotArchive({ send } as never, () => "2026-07-11T10:00:00.000Z");

    await expect(archive.ensureArchived(input(filePath))).resolves.toEqual({
      bucket: "opentrade-snapshots",
      objectKey: "us/fl/dbpr/snapshot.csv",
      sha256: "a".repeat(64),
      bytes: 8,
      etag: "etag-value",
      versionId: "version-1",
      lastModifiedAt: "2026-07-11T09:00:00.000Z",
      verifiedAt: "2026-07-11T10:00:00.000Z",
    });

    expect(commandName(send.mock.calls[0]?.[0])).toBe("HeadObjectCommand");
    const put = send.mock.calls[1]?.[0] as { input: Record<string, unknown> };
    expect(commandName(put)).toBe("PutObjectCommand");
    expect(put.input).toMatchObject({
      Bucket: "opentrade-snapshots",
      Key: "us/fl/dbpr/snapshot.csv",
      ContentLength: 8,
      IfNoneMatch: "*",
      Metadata: { sha256: "a".repeat(64), "source-id": "us.fl.dbpr.construction" },
    });
  });

  it("reuses an existing matching object without overwriting it", async () => {
    const send = vi.fn().mockResolvedValue(head());
    const archive = new S3SnapshotArchive({ send } as never);
    await archive.ensureArchived(input("/snapshot.csv"));
    expect(send).toHaveBeenCalledOnce();
    expect(commandName(send.mock.calls[0]?.[0])).toBe("HeadObjectCommand");
  });

  it("recovers a concurrent conditional write by verifying the winner", async () => {
    const filePath = await snapshotFile();
    const send = vi.fn()
      .mockRejectedValueOnce(notFound())
      .mockRejectedValueOnce({ name: "PreconditionFailed", $metadata: { httpStatusCode: 412 } })
      .mockResolvedValueOnce(head());
    const archive = new S3SnapshotArchive({ send } as never);
    await expect(archive.ensureArchived(input(filePath))).resolves.toMatchObject({ sha256: "a".repeat(64) });
  });

  it("rejects mismatched bytes, checksum metadata, and source identity", async () => {
    await expect(archiveWithHead({ ContentLength: 7 }).ensureArchived(input("/snapshot.csv"))).rejects.toThrow("byte count");
    await expect(archiveWithHead({ Metadata: { sha256: "b".repeat(64), "source-id": "us.fl.dbpr.construction" } }).ensureArchived(input("/snapshot.csv"))).rejects.toThrow("SHA-256");
    await expect(archiveWithHead({ ChecksumSHA256: Buffer.from("b".repeat(64), "hex").toString("base64") }).ensureArchived(input("/snapshot.csv"))).rejects.toThrow("server checksum");
    await expect(archiveWithHead({ Metadata: { sha256: "a".repeat(64), "source-id": "us.tx.tdlr.all_licenses" } }).ensureArchived(input("/snapshot.csv"))).rejects.toThrow("source metadata");
  });

  it("validates archive endpoints before constructing a client", () => {
    expect(parseArchiveEndpoint("http://minio:9000").href).toBe("http://minio:9000/");
    expect(() => parseArchiveEndpoint("ftp://minio:9000")).toThrow("HTTP or HTTPS");
    expect(() => parseArchiveEndpoint("https://user:secret@minio.example")).toThrow("credentials");
    expect(() => parseArchiveEndpoint("https://minio.example/path")).toThrow("path");
  });
});

function archiveWithHead(overrides: Record<string, unknown>) {
  return new S3SnapshotArchive({ send: vi.fn().mockResolvedValue({ ...head(), ...overrides }) } as never);
}

function head() {
  return {
    ContentLength: 8,
    Metadata: { sha256: "a".repeat(64), "source-id": "us.fl.dbpr.construction" },
    ChecksumSHA256: Buffer.from("a".repeat(64), "hex").toString("base64"),
    ETag: '"etag-value"',
    VersionId: "version-1",
    LastModified: new Date("2026-07-11T09:00:00.000Z"),
  };
}

function notFound() {
  return { name: "NotFound", $metadata: { httpStatusCode: 404 } };
}

function input(filePath: string) {
  return {
    bucket: "opentrade-snapshots",
    objectKey: "us/fl/dbpr/snapshot.csv",
    filePath,
    sha256: "a".repeat(64),
    bytes: 8,
    sourceId: "us.fl.dbpr.construction",
    fetchedAt: "2026-07-11T08:00:00.000Z",
    contentType: "text/csv",
  };
}

async function snapshotFile(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "opentrade-archive-"));
  const filePath = join(root, "snapshot.csv");
  await writeFile(filePath, "snapshot");
  return filePath;
}

function commandName(value: unknown): string | undefined {
  return (value as { constructor?: { name?: string } })?.constructor?.name;
}
