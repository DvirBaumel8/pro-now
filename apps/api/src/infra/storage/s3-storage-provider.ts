import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageObjectHead, StorageProvider } from "@pro-now/types";

type S3Command = PutObjectCommand | GetObjectCommand | HeadObjectCommand | DeleteObjectCommand;
type Signer = (
  client: S3Client,
  command: PutObjectCommand | GetObjectCommand,
  options: { expiresIn: number }
) => Promise<string>;
type Sender = (command: S3Command) => Promise<unknown>;

export interface S3StorageProviderOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  signer?: Signer;
  send?: Sender;
  isSandbox?: boolean;
}

/** S3-compatible storage adapter used by SeaweedFS locally and R2 later. */
export class S3StorageProvider implements StorageProvider {
  readonly isSandbox: boolean;
  readonly signer: Signer;
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly sendCommand: Sender;

  constructor(options: S3StorageProviderOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: options.forcePathStyle ?? Boolean(options.endpoint),
      // SeaweedFS and R2 accept the signed object headers without the SDK's
      // optional checksum header. Requiring checksums only when a command
      // explicitly asks for one keeps presigned browser PUTs portable.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
    this.signer = options.signer ?? getSignedUrl;
    this.sendCommand = options.send ?? ((command) => this.client.send(command));
    this.isSandbox = options.isSandbox ?? Boolean(options.endpoint?.match(/^https?:\/\/(localhost|127\.|0\.0\.0\.0)/));
  }

  async createPresignedPut(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
  }): Promise<string> {
    return this.signer(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
      { expiresIn: input.expiresInSeconds }
    );
  }

  async createPresignedGet(input: { key: string; expiresInSeconds: number }): Promise<string> {
    return this.signer(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: input.key }),
      { expiresIn: input.expiresInSeconds }
    );
  }

  async head(key: string): Promise<StorageObjectHead | null> {
    try {
      const output = (await this.sendCommand(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      )) as HeadObjectCommandOutput;
      if (typeof output.ContentLength !== "number" || typeof output.ContentType !== "string") {
        throw new Error(`Storage object ${key} returned incomplete HEAD metadata`);
      }
      return { bytes: output.ContentLength, mime: output.ContentType, etag: output.ETag };
    } catch (error) {
      if (isMissingObjectError(error)) return null;
      throw error;
    }
  }

  async readPrefix(key: string, bytes: number): Promise<Uint8Array> {
    const output = (await this.sendCommand(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${Math.max(0, bytes - 1)}` })
    )) as { Body?: AsyncIterable<Uint8Array> };
    if (!output.Body) throw new Error(`Storage object ${key} returned no body`);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of output.Body) {
      chunks.push(chunk);
      total += chunk.byteLength;
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  async delete(key: string): Promise<void> {
    await this.sendCommand(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey" ||
    candidate.Code === "NotFound" ||
    candidate.Code === "NoSuchKey" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
