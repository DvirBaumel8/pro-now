export interface StorageObjectHead {
  bytes: number;
  mime: string;
  etag?: string;
}

export interface StorageProvider {
  readonly isSandbox: boolean;

  createPresignedPut(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
  }): Promise<string>;

  createPresignedGet(input: { key: string; expiresInSeconds: number }): Promise<string>;

  head(key: string): Promise<StorageObjectHead | null>;

  readPrefix(key: string, bytes: number): Promise<Uint8Array>;

  delete(key: string): Promise<void>;
}
