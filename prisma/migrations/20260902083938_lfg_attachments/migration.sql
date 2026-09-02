-- CreateTable
CREATE TABLE "lfg_attachments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "uploadedByMeepleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lfg_attachments_postId_idx" ON "lfg_attachments"("postId");

-- CreateIndex
CREATE INDEX "lfg_attachments_uploadedByMeepleId_idx" ON "lfg_attachments"("uploadedByMeepleId");

-- AddForeignKey
ALTER TABLE "lfg_attachments" ADD CONSTRAINT "lfg_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "lfg_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_attachments" ADD CONSTRAINT "lfg_attachments_uploadedByMeepleId_fkey" FOREIGN KEY ("uploadedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
