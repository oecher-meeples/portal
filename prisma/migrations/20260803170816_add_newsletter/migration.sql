-- CreateEnum
CREATE TYPE "NewsletterCategory" AS ENUM ('TERMINE', 'NEWS', 'TURNIERE', 'BERICHTE');

-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "NewsletterDispatchStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "newsletterAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newsletterCategory" "NewsletterCategory",
ADD COLUMN     "newsletterLastError" TEXT,
ADD COLUMN     "newsletterSentAt" TIMESTAMP(3),
ADD COLUMN     "newsletterStatus" "NewsletterDispatchStatus",
ADD COLUMN     "sendAsNewsletter" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "meepleId" TEXT,
    "categories" "NewsletterCategory"[],
    "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "manageToken" TEXT NOT NULL,
    "confirmationSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_dispatch_jobs" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "status" "NewsletterDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_dispatch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_meepleId_key" ON "newsletter_subscribers"("meepleId");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_manageToken_key" ON "newsletter_subscribers"("manageToken");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_dispatch_jobs_postId_subscriberId_key" ON "newsletter_dispatch_jobs"("postId", "subscriberId");

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_dispatch_jobs" ADD CONSTRAINT "newsletter_dispatch_jobs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_dispatch_jobs" ADD CONSTRAINT "newsletter_dispatch_jobs_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
