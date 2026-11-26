-- AlterTable
ALTER TABLE "helper_roles" ADD COLUMN     "guideDownloadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "helper_roles_guideDownloadId_key" ON "helper_roles"("guideDownloadId");

-- AddForeignKey
ALTER TABLE "helper_roles" ADD CONSTRAINT "helper_roles_guideDownloadId_fkey" FOREIGN KEY ("guideDownloadId") REFERENCES "downloads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
