import type { StorageProvider } from "@pro-now/types";

const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const READY_RETENTION_MS = 4 * 24 * 60 * 60 * 1000;

interface CleanupUpload {
  id: string;
  storageKey: string;
}

export interface UploadCleanupStore {
  upload: {
    findMany(args: { where: { status: string; createdAt: { lt: Date } } }): Promise<CleanupUpload[]>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
  jobMedia: { deleteMany(args: { where: { uploadId: string } }): Promise<unknown> };
  professionalDocument: { updateMany(args: { where: { uploadId: string }; data: { uploadId: null } }): Promise<unknown> };
}

export interface MediaCleanupResult {
  pendingDeleted: number;
  retainedDeleted: number;
  failed: number;
}

export async function cleanupUploads(
  store: UploadCleanupStore,
  storage: Pick<StorageProvider, "delete">,
  now = new Date()
): Promise<MediaCleanupResult> {
  const pending = await store.upload.findMany({
    where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - PENDING_MAX_AGE_MS) } },
  });
  const retained = await store.upload.findMany({
    where: { status: "READY", createdAt: { lt: new Date(now.getTime() - READY_RETENTION_MS) } },
  });
  const result: MediaCleanupResult = { pendingDeleted: 0, retainedDeleted: 0, failed: 0 };

  for (const upload of pending) {
    if (await deleteUpload(store, storage, upload, false)) result.pendingDeleted += 1;
    else result.failed += 1;
  }
  for (const upload of retained) {
    if (await deleteUpload(store, storage, upload, true)) result.retainedDeleted += 1;
    else result.failed += 1;
  }
  return result;
}

async function deleteUpload(
  store: UploadCleanupStore,
  storage: Pick<StorageProvider, "delete">,
  upload: CleanupUpload,
  removeLinks: boolean
): Promise<boolean> {
  try {
    await storage.delete(upload.storageKey);
    if (removeLinks) {
      await store.jobMedia.deleteMany({ where: { uploadId: upload.id } });
      await store.professionalDocument.updateMany({ where: { uploadId: upload.id }, data: { uploadId: null } });
    }
    await store.upload.delete({ where: { id: upload.id } });
    return true;
  } catch {
    return false;
  }
}
