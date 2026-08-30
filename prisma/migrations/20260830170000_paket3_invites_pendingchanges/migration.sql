/*
  Warnings:

  - Made the column `email` on table `invites` required. This step will fail if there are existing NULL values in that column.

*/

-- DataMigration: unbound invites (email IS NULL) are dropped by #329 — no
-- bound replacement value exists to backfill, and the repo's dev data at this
-- point only ever holds demo rows here (no production scope, see repo memory).
DELETE FROM "invites" WHERE "email" IS NULL;

-- CreateEnum
CREATE TYPE "PendingChangeKind" AS ENUM ('IBAN', 'MEMBER_EMAIL');

-- AlterTable
ALTER TABLE "invites" ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "invite_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultDays" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_changes" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" "PendingChangeKind" NOT NULL,
    "newValue" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "pending_changes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pending_changes" ADD CONSTRAINT "pending_changes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
