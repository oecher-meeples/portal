-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PUBLIC', 'INTERNAL', 'OFFLINE');

-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "downloads_status_idx" ON "downloads"("status");
