-- CreateTable
CREATE TABLE "auth_users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" UUID NOT NULL,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(6),
    "refreshTokenExpiresAt" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verifications" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_accounts_userId_idx" ON "auth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_issuer_accountId_key" ON "auth_accounts"("issuer", "accountId");

-- CreateIndex
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications"("identifier");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data carry-over from Neon Auth (docs/adr/0015). Only runs when the
-- database still has Neon Auth's managed `neon_auth` schema — i.e. when this
-- migration is applied to the existing Neon database, or to a self-hosted
-- Postgres restored from a `pg_dump` of it. On a fresh database this block
-- is a no-op. User ids are copied unchanged, so every existing
-- `neonAuthUserId` reference (Meeple, UserRole, LoginLog, ...) stays valid,
-- and the password hashes are better-auth's own scrypt format on both sides.
-- Only credential (email + password) accounts are carried over: Google SSO
-- is dropped without replacement, and sessions/verification tokens are
-- deliberately not copied (different cookie secret — everyone logs in once).
DO $$
BEGIN
  IF to_regclass('neon_auth."user"') IS NOT NULL THEN
    INSERT INTO "auth_users" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
    SELECT "id", "name", lower("email"), "emailVerified", "image", "createdAt", "updatedAt"
    FROM neon_auth."user"
    ON CONFLICT DO NOTHING;

    INSERT INTO "auth_accounts" ("id", "issuer", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
    SELECT a."id", 'local:credential', a."userId"::text, 'credential', a."userId", a."password", a."createdAt", a."updatedAt"
    FROM neon_auth."account" a
    JOIN "auth_users" u ON u."id" = a."userId"
    WHERE a."providerId" = 'credential'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
