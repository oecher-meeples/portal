-- CreateTable
CREATE TABLE "lfg_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gameTitle" TEXT,
    "description" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3),
    "dateNote" TEXT,
    "location" TEXT,
    "maxParticipants" INTEGER NOT NULL,
    "createdByMeepleId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lfg_participants" (
    "postId" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_participants_pkey" PRIMARY KEY ("postId","meepleId")
);

-- CreateIndex
CREATE INDEX "lfg_posts_createdByMeepleId_idx" ON "lfg_posts"("createdByMeepleId");

-- AddForeignKey
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_createdByMeepleId_fkey" FOREIGN KEY ("createdByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_postId_fkey" FOREIGN KEY ("postId") REFERENCES "lfg_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
