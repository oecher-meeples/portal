-- better-auth 1.7.3+ schreibt die in 1.7.0–1.7.2 eingeführte `issuer`-Spalte
-- nicht mehr (Upgrade-Guide: better-auth.com/docs/guides/1-7-upgrade-guide).
-- Konten werden wieder über (providerId, accountId) erkannt; ohne Drop würde
-- die NOT-NULL-Spalte jeden Sign-up abweisen.

-- DropIndex
DROP INDEX "auth_accounts_issuer_accountId_key";

-- AlterTable
ALTER TABLE "auth_accounts" DROP COLUMN "issuer";

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_providerId_accountId_key" ON "auth_accounts"("providerId", "accountId");
