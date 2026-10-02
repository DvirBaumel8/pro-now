CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "professional_documents" ADD COLUMN "uploadId" TEXT;
ALTER TABLE "job_media" ADD COLUMN "uploadId" TEXT;

CREATE UNIQUE INDEX "uploads_storageKey_key" ON "uploads"("storageKey");
CREATE INDEX "uploads_ownerId_status_idx" ON "uploads"("ownerId", "status");
CREATE INDEX "uploads_status_createdAt_idx" ON "uploads"("status", "createdAt");
CREATE INDEX "professional_documents_uploadId_idx" ON "professional_documents"("uploadId");
CREATE INDEX "job_media_uploadId_idx" ON "job_media"("uploadId");

ALTER TABLE "uploads" ADD CONSTRAINT "uploads_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_documents" ADD CONSTRAINT "professional_documents_uploadId_fkey"
  FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_media" ADD CONSTRAINT "job_media_uploadId_fkey"
  FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
