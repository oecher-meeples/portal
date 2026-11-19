-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('MECHANIC', 'CATEGORY');

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "type" "TagType" NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "bggId" INTEGER,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_game_tags" (
    "boardGameId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "board_game_tags_pkey" PRIMARY KEY ("boardGameId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_dedupKey_key" ON "tags"("dedupKey");

-- CreateIndex
CREATE INDEX "tags_type_idx" ON "tags"("type");

-- CreateIndex
CREATE INDEX "board_game_tags_tagId_idx" ON "board_game_tags"("tagId");

-- AddForeignKey
ALTER TABLE "board_game_tags" ADD CONSTRAINT "board_game_tags_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_game_tags" ADD CONSTRAINT "board_game_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
