import type { StorageProvider } from "@pro-now/types";
import { S3StorageProvider } from "./s3-storage-provider.js";

export interface StorageConfig {
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
