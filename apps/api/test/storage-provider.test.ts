import { describe, expect, it, vi } from "vitest";

import { S3StorageProvider } from "../src/infra/storage/s3-storage-provider.js";

describe("S3StorageProvider", () => {
  it("presigns PUTs with the content type and exact byte length", async () => {
    const provider = new S3StorageProvider({
      endpoint: "http://localhost:8333",
      region: "us-east-1",
      bucket: "pronow-media",
      accessKeyId: "test-access",
      secretAccessKey: "test-secret",
      signer: vi.fn().mockResolvedValue("https://storage.test/upload"),
    });

    await expect(
      provider.createPresignedPut({
        key: "uploads/u1/source.jpg",
        contentType: "image/jpeg",
        contentLength: 1234,
        expiresInSeconds: 300,
      })
    ).resolves.toBe("https://storage.test/upload");

    expect(provider.signer).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: "pronow-media",
          Key: "uploads/u1/source.jpg",
          ContentType: "image/jpeg",
          ContentLength: 1234,
        }),
      }),
      { expiresIn: 300 }
    );
  });

  it("maps HEAD metadata and returns null for a missing object", async () => {
    const provider = new S3StorageProvider({
      endpoint: "http://localhost:8333",
      region: "us-east-1",
      bucket: "pronow-media",
      accessKeyId: "test-access",
      secretAccessKey: "test-secret",
      send: vi
        .fn()
        .mockResolvedValueOnce({ ContentLength: 12, ContentType: "image/jpeg", ETag: '"abc"' })
        .mockRejectedValueOnce(Object.assign(new Error("missing"), { name: "NotFound" })),
    });

    await expect(provider.head("uploads/u1/source.jpg")).resolves.toEqual({
      bytes: 12,
      mime: "image/jpeg",
      etag: '"abc"',
    });
    await expect(provider.head("uploads/missing")).resolves.toBeNull();
  });
});
