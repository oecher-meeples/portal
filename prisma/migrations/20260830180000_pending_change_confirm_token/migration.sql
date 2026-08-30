-- AlterTable
ALTER TABLE "pending_changes" ADD COLUMN     "confirmToken" TEXT,
ADD COLUMN     "newAccountHolder" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pending_changes_confirmToken_key" ON "pending_changes"("confirmToken");
