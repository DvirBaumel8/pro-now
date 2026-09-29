import type { StorageProvider } from "@pro-now/types";
import { S3StorageProvider } from "./s3-storage-provider.js";

export interface StorageConfig {
  NODE_ENV?: string;
  S3_ENDPOINT?: string;
  S3_REGION: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
}

export function createStorageProvider(config: StorageConfig): StorageProvider {
  const missing = [
    ["S3_BUCKET", config.S3_BUCKET],
    ["S3_ACCESS_KEY_ID", config.S3_ACCESS_KEY_ID],
    ["S3_SECRET_ACCESS_KEY", config.S3_SECRET_ACCESS_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    if (config.NODE_ENV === "test") return new UnavailableStorageProvider();
    throw new Error(`Storage is not configured: missing ${missing.join(", ")}`);
  }

  return new S3StorageProvider({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    bucket: config.S3_BUCKET!,
    accessKeyId: config.S3_ACCESS_KEY_ID!,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
  });
}

/** Test-only boot fallback: it makes health/import checks honest without pretending uploads work. */
class UnavailableStorageProvider implements StorageProvider {
  readonly isSandbox = true;

  createPresignedPut(): Promise<string> {
    return Promise.reject(new Error("Storage is not configured"));
  }

  createPresignedGet(): Promise<string> {
    return Promise.reject(new Error("Storage is not configured"));
  }

  head(): Promise<null> {
    return Promise.reject(new Error("Storage is not configured"));
  }

  readPrefix(): Promise<Uint8Array> {
    return Promise.reject(new Error("Storage is not configured"));
  }

  delete(): Promise<void> {
    return Promise.reject(new Error("Storage is not configured"));
  }
}
