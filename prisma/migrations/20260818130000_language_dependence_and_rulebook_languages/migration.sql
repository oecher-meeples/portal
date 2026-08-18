-- CreateEnum
CREATE TYPE "LanguageDependence" AS ENUM ('NO_NECESSARY_TEXT', 'SOME_NECESSARY_TEXT', 'MODERATE_TEXT', 'EXTENSIVE_TEXT', 'UNPLAYABLE');

-- CreateEnum
CREATE TYPE "RuleBookLanguage" AS ENUM ('DE', 'EN', 'OTHER');

-- AlterTable
ALTER TABLE "board_games" ADD COLUMN "languageDependence" "LanguageDependence";

-- AlterTable
ALTER TABLE "game_copies" ADD COLUMN "ruleBookLanguages" "RuleBookLanguage"[] NOT NULL DEFAULT ARRAY[]::"RuleBookLanguage"[];
