-- CreateTable
CREATE TABLE "post_instagram_details" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "status" "InstagramStatus" NOT NULL DEFAULT 'PENDING',
    "postUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "post_instagram_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_instagram_details_postId_key" ON "post_instagram_details"("postId");

-- AddForeignKey
ALTER TABLE "post_instagram_details" ADD CONSTRAINT "post_instagram_details_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: bestehende Instagram-Versand-Felder von "posts" übernehmen
-- (#318) — nur Zeilen, die je einen Status hatten (analog zur bisherigen
-- eager-Anlage bei instagram: true).
INSERT INTO "post_instagram_details" ("id", "postId", "status", "postUrl", "attempts", "lastError")
SELECT gen_random_uuid()::text, "id", "instagramStatus", "instagramPostUrl", "instagramAttempts", "instagramLastError"
FROM "posts"
WHERE "instagramStatus" IS NOT NULL;

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "instagramAttempts",
DROP COLUMN "instagramLastError",
DROP COLUMN "instagramPostUrl",
DROP COLUMN "instagramStatus";
