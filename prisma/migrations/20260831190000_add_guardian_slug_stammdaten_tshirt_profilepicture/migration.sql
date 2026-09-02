-- CreateEnum
CREATE TYPE "ProfilePictureVisibility" AS ENUM ('INTERN', 'EVENTS', 'IMMER');

-- AlterEnum
ALTER TYPE "PendingChangeKind" ADD VALUE 'MEMBER_STAMMDATEN';

-- AlterTable
ALTER TABLE "meeples" ADD COLUMN     "profilePictureUrl" TEXT,
ADD COLUMN     "profilePictureVisibility" "ProfilePictureVisibility" NOT NULL DEFAULT 'INTERN';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "tshirtSizeId" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- Backfill: existing members get a deterministic slug from their member
-- number (#379) — `uniqueSlug()` is only used for new members going forward,
-- there is no naming collision risk here since memberNumber is unique.
UPDATE "members" SET "slug" = 'mitglied-' || "memberNumber"::text WHERE "slug" IS NULL;

ALTER TABLE "members" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "pending_changes" ADD COLUMN     "fieldsJson" TEXT;

-- CreateTable
CREATE TABLE "member_guardians" (
    "childMemberId" TEXT NOT NULL,
    "guardianMemberId" TEXT NOT NULL,

    CONSTRAINT "member_guardians_pkey" PRIMARY KEY ("childMemberId","guardianMemberId")
);

-- CreateTable
CREATE TABLE "tshirt_sizes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tshirt_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tshirt_sizes_label_key" ON "tshirt_sizes"("label");

-- CreateIndex
CREATE UNIQUE INDEX "members_slug_key" ON "members"("slug");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_tshirtSizeId_fkey" FOREIGN KEY ("tshirtSizeId") REFERENCES "tshirt_sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_guardians" ADD CONSTRAINT "member_guardians_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_guardians" ADD CONSTRAINT "member_guardians_guardianMemberId_fkey" FOREIGN KEY ("guardianMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
