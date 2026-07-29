-- CreateTable
CREATE TABLE "meeples" (
    "id" TEXT NOT NULL,
    "neonAuthUserId" TEXT,
    "memberNumber" SERIAL NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resignedAt" TIMESTAMP(3),
    "membershipEndsAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "ibanEncrypted" TEXT,
    "ibanLast4" TEXT,
    "accountHolder" TEXT,
    "bggUsername" TEXT,
    "bgaUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeples_neonAuthUserId_key" ON "meeples"("neonAuthUserId");

-- CreateIndex
CREATE UNIQUE INDEX "meeples_memberNumber_key" ON "meeples"("memberNumber");
