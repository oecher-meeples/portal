-- CreateTable
CREATE TABLE "post_images" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_images_key_key" ON "post_images"("key");

-- CreateIndex
CREATE INDEX "post_images_postId_idx" ON "post_images"("postId");

-- AddForeignKey
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
