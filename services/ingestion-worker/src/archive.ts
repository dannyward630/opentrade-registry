import { createReadStream } from "node:fs";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

export type SnapshotArchiveInput = {
  bucket: string;
  objectKey: string;
  filePath: string;
  sha256: string;
  bytes: number;
  sourceId: string;
  fetchedAt: string;
  contentType?: string | null;
  signal?: AbortSignal;
};

export type SnapshotArchiveEvidence = {
  bucket: string;
  objectKey: string;
  sha256: string;
  bytes: number;
  etag: string | null;
  versionId: string | null;
  lastModifiedAt: string | null;
  verifiedAt: string;
};

export interface SnapshotArchive {
  ensureArchived(input: SnapshotArchiveInput): Promise<SnapshotArchiveEvidence>;
}

type SnapshotObjectClient = Pick<S3Client, "send">;

export class S3SnapshotArchive implements SnapshotArchive {
  constructor(
    private readonly client: SnapshotObjectClient,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async ensureArchived(input: SnapshotArchiveInput): Promise<SnapshotArchiveEvidence> {
    input.signal?.throwIfAborted();
    let head = await this.headIfPresent(input);
    if (!head) {
      try {
        await this.client.send(new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.objectKey,
          Body: createReadStream(input.filePath, { signal: input.signal }),
          ContentLength: input.bytes,
          ContentType: input.contentType ?? undefined,
          ChecksumSHA256: Buffer.from(input.sha256, "hex").toString("base64"),
          IfNoneMatch: "*",
          Metadata: {
            sha256: input.sha256,
            "source-id": input.sourceId,
            "fetched-at": input.fetchedAt,
          },
        }), { abortSignal: input.signal });
      } catch (error) {
        if (!isPreconditionFailure(error)) throw error;
      }
      head = await this.headIfPresent(input);
      if (!head) throw new Error("Snapshot archive write completed without a readable object.");
    }
    return verifyArchivedObject(input, head, this.now());
  }

  private async headIfPresent(input: SnapshotArchiveInput): Promise<HeadObjectCommandOutput | null> {
    try {
      return await this.client.send(new HeadObjectCommand({ Bucket: input.bucket, Key: input.objectKey, ChecksumMode: "ENABLED" }), {
        abortSignal: input.signal,
      });
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
}

export function createS3SnapshotArchive(input: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  now?: () => string;
}): S3SnapshotArchive {
  const endpoint = parseArchiveEndpoint(input.endpoint);
  const config: S3ClientConfig = {
    endpoint: endpoint.href,
    region: input.region,
    forcePathStyle: true,
    credentials: { accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey },
  };
  return new S3SnapshotArchive(new S3Client(config), input.now);
}

export function parseArchiveEndpoint(value: string): URL {
  const endpoint = new URL(value);
  if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") {
    throw new Error("Snapshot archive endpoint must use HTTP or HTTPS.");
  }
  if (endpoint.username || endpoint.password) throw new Error("Snapshot archive endpoint cannot contain credentials.");
  if (endpoint.pathname !== "/" || endpoint.search || endpoint.hash) {
    throw new Error("Snapshot archive endpoint cannot contain a path, query, or fragment.");
  }
  return endpoint;
}

function verifyArchivedObject(
  input: SnapshotArchiveInput,
  head: HeadObjectCommandOutput,
  verifiedAt: string,
): SnapshotArchiveEvidence {
  if (head.ContentLength !== input.bytes) {
    throw new Error(`Archived snapshot byte count ${head.ContentLength ?? "missing"} does not match local byte count ${input.bytes}.`);
  }
  const archivedSha256 = head.Metadata?.sha256?.toLowerCase();
  if (archivedSha256 !== input.sha256) {
    throw new Error("Archived snapshot SHA-256 metadata does not match the inspected local file.");
  }
  const storedChecksum = head.ChecksumSHA256;
  const expectedChecksum = Buffer.from(input.sha256, "hex").toString("base64");
  if (storedChecksum !== expectedChecksum) {
    throw new Error("Archived snapshot server checksum does not match the inspected local file.");
  }
  if (head.Metadata?.["source-id"] !== input.sourceId) {
    throw new Error("Archived snapshot source metadata does not match the trusted source ID.");
  }
  return {
    bucket: input.bucket,
    objectKey: input.objectKey,
    sha256: input.sha256,
    bytes: input.bytes,
    etag: normalizeEtag(head.ETag),
    versionId: head.VersionId ?? null,
    lastModifiedAt: head.LastModified?.toISOString() ?? null,
    verifiedAt,
  };
}

function normalizeEtag(value: string | undefined): string | null {
  return value?.replace(/^"|"$/g, "") || null;
}

function isNotFound(error: unknown): boolean {
  const candidate = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  return candidate?.name === "NotFound" || candidate?.name === "NoSuchKey" || candidate?.$metadata?.httpStatusCode === 404;
}

function isPreconditionFailure(error: unknown): boolean {
  const candidate = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  return candidate?.name === "PreconditionFailed" || candidate?.$metadata?.httpStatusCode === 412;
}
