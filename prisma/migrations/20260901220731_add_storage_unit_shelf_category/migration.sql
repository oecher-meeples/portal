-- CreateEnum
CREATE TYPE "ShelfCategory" AS ENUM ('ZWEI_PERSONEN', 'KINDER_FAMILIE', 'KENNERSPIELE', 'EXPERTENSPIELE', 'KOOPERATIV', 'PARTY');

-- AlterTable
ALTER TABLE "storage_units" ADD COLUMN     "category" "ShelfCategory";
