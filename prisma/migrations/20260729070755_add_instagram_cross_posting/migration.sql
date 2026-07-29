-- CreateEnum
CREATE TYPE "InstagramStatus" AS ENUM ('PENDING', 'QUEUED', 'POSTED', 'FAILED');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "instagramAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "instagramLastError" TEXT,
ADD COLUMN     "instagramPostUrl" TEXT,
ADD COLUMN     "instagramStatus" "InstagramStatus";

-- CreateTable
CREATE TABLE "instagram_connections" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "igBusinessAccountId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_connections_pkey" PRIMARY KEY ("id")
);
