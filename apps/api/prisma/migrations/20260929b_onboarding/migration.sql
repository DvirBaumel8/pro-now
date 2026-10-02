-- AlterTable
ALTER TABLE "customer_profiles" ADD COLUMN     "avatarAnswered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avatarId" TEXT,
ADD COLUMN     "introSeenAt" TIMESTAMP(3);

