-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "portraitKind" TEXT,
ADD COLUMN     "portraitUploadId" TEXT;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_portraitUploadId_fkey" FOREIGN KEY ("portraitUploadId") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

