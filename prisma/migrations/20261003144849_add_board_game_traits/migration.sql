-- CreateEnum
CREATE TYPE "BoardGameTrait" AS ENUM ('LEGACY', 'CAMPAIGN', 'LIMITED_REPLAYABILITY', 'SOLITAIRE_SUPPORTED', 'DIGITAL_HYBRID');

-- CreateEnum
CREATE TYPE "BoardGameTraitTone" AS ENUM ('INFO', 'WARNING', 'DANGER');

-- AlterTable
ALTER TABLE "board_games" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "traits" "BoardGameTrait"[];

-- CreateTable
CREATE TABLE "board_game_trait_texts" (
    "trait" "BoardGameTrait" NOT NULL,
    "label" TEXT,
    "tooltip" TEXT,
    "tone" "BoardGameTraitTone" NOT NULL DEFAULT 'INFO',
    "loanMessage" TEXT,
    "detailsMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_game_trait_texts_pkey" PRIMARY KEY ("trait")
);
