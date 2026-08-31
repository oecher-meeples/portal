-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "isSystemRole" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "rate_limit_attempts" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "currentCooldownSecs" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFailedIp" TEXT,

    CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_logs" (
    "id" TEXT NOT NULL,
    "neonAuthUserId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_attempts_key_key" ON "rate_limit_attempts"("key");

-- CreateIndex
CREATE INDEX "login_logs_neonAuthUserId_idx" ON "login_logs"("neonAuthUserId");

-- CreateIndex
CREATE INDEX "login_logs_at_idx" ON "login_logs"("at");
