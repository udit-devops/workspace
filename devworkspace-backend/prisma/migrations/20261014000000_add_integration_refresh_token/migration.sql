-- AlterTable
ALTER TABLE "Integration" ADD COLUMN "refreshToken" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3);
