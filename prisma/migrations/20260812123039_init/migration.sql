-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('BLOG', 'TERMIN', 'TURNIER');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "InstagramStatus" AS ENUM ('PENDING', 'QUEUED', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "BankDataAccessKind" AS ENUM ('SINGLE_REVEAL', 'CSV_EXPORT');

-- CreateEnum
CREATE TYPE "GameInventoryStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DEINVENTARISED');

-- CreateEnum
CREATE TYPE "StorageUnitKind" AS ENUM ('BOX', 'SHELF');

-- CreateEnum
CREATE TYPE "BoardGameKind" AS ENUM ('BOARDGAME', 'BOARDGAME_EXPANSION');

-- CreateEnum
CREATE TYPE "HoldingOrigin" AS ENUM ('INITIAL', 'LOAN', 'RETURN', 'HANDOVER', 'RELOCATION');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('THEKE', 'KASSE', 'LEIHE');

-- CreateEnum
CREATE TYPE "ExplainerExperienceLevel" AS ENUM ('WITH_MANUAL', 'WITHOUT_MANUAL', 'BY_HEART');

-- CreateEnum
CREATE TYPE "FleaMarketItemStatus" AS ENUM ('PENDING', 'FOR_SALE', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "NewsletterCategory" AS ENUM ('TERMINE', 'NEWS', 'TURNIERE', 'BERICHTE');

-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "NewsletterDispatchStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PUBLIC', 'INTERNAL', 'OFFLINE');

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "neonAuthUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("neonAuthUserId","roleId")
);

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
    "telegramHandle" TEXT,
    "signalHandle" TEXT,
    "discordHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lfg_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gameTitle" TEXT,
    "description" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3),
    "dateNote" TEXT,
    "location" TEXT,
    "maxParticipants" INTEGER NOT NULL,
    "createdByMeepleId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lfg_participants" (
    "postId" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_participants_pkey" PRIMARY KEY ("postId","meepleId")
);

-- CreateTable
CREATE TABLE "bank_data_access_logs" (
    "id" TEXT NOT NULL,
    "accessedByMeepleId" TEXT NOT NULL,
    "subjectMeepleId" TEXT,
    "kind" "BankDataAccessKind" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_data_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "author" TEXT,
    "location" TEXT,
    "internal" BOOLEAN,
    "instagram" BOOLEAN,
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "coverImageUrl" TEXT,
    "instagramStatus" "InstagramStatus",
    "instagramPostUrl" TEXT,
    "instagramAttempts" INTEGER NOT NULL DEFAULT 0,
    "instagramLastError" TEXT,
    "sendAsNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "newsletterCategory" "NewsletterCategory",
    "newsletterStatus" "NewsletterDispatchStatus",
    "newsletterAttempts" INTEGER NOT NULL DEFAULT 0,
    "newsletterLastError" TEXT,
    "newsletterSentAt" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bggId" INTEGER,
    "ean" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playTimeMinutes" INTEGER,
    "weight" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "description" TEXT,
    "mechanics" TEXT[],
    "explainerVideoUrl" TEXT,
    "kind" "BoardGameKind" NOT NULL DEFAULT 'BOARDGAME',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_copies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "condition" TEXT,
    "needsCompletenessCheck" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "status" "GameInventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "archivedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_part_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "boardGameId" TEXT,
    "condition" TEXT NOT NULL,
    "description" TEXT,
    "keeperMeepleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_part_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_listings" (
    "id" TEXT NOT NULL,
    "sellerMeepleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceEuros" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_game_collection_entries" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_game_collection_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_collections" (
    "baseGameId" TEXT NOT NULL,
    "expansionId" TEXT NOT NULL,

    CONSTRAINT "game_collections_pkey" PRIMARY KEY ("baseGameId","expansionId")
);

-- CreateTable
CREATE TABLE "storage_units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "StorageUnitKind" NOT NULL,
    "label" TEXT NOT NULL,
    "parentUnitId" TEXT,
    "keeperMeepleId" TEXT,
    "locationNote" TEXT,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_unit_moves" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "keeperMeepleId" TEXT,
    "parentUnitId" TEXT,
    "locationNote" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "recordedByMeepleId" TEXT NOT NULL,

    CONSTRAINT "storage_unit_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_holdings" (
    "id" TEXT NOT NULL,
    "gameCopyId" TEXT NOT NULL,
    "unitId" TEXT,
    "meepleId" TEXT,
    "origin" "HoldingOrigin" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "recordedByMeepleId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "game_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_shelf_assignments" (
    "eventId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "event_shelf_assignments_pkey" PRIMARY KEY ("eventId","unitId")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "ShiftType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_bookings" (
    "shiftId" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "uncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_bookings_pkey" PRIMARY KEY ("shiftId","meepleId")
);

-- CreateTable
CREATE TABLE "explainer_games" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "level" "ExplainerExperienceLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "explainer_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explainer_attendances" (
    "eventId" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explainer_attendances_pkey" PRIMARY KEY ("eventId","meepleId")
);

-- CreateTable
CREATE TABLE "flea_market_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sellerMeepleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceEuros" INTEGER NOT NULL,
    "status" "FleaMarketItemStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedByMeepleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flea_market_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_connections" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "igBusinessAccountId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "meeples_neonAuthUserId_key" ON "meeples"("neonAuthUserId");

-- CreateIndex
CREATE UNIQUE INDEX "meeples_memberNumber_key" ON "meeples"("memberNumber");

-- CreateIndex
CREATE INDEX "deletion_requests_meepleId_idx" ON "deletion_requests"("meepleId");

-- CreateIndex
CREATE INDEX "deletion_requests_handledAt_idx" ON "deletion_requests"("handledAt");

-- CreateIndex
CREATE INDEX "lfg_posts_createdByMeepleId_idx" ON "lfg_posts"("createdByMeepleId");

-- CreateIndex
CREATE INDEX "bank_data_access_logs_at_idx" ON "bank_data_access_logs"("at");

-- CreateIndex
CREATE INDEX "bank_data_access_logs_subjectMeepleId_idx" ON "bank_data_access_logs"("subjectMeepleId");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_type_internal_date_idx" ON "posts"("type", "internal", "date");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_meepleId_key" ON "newsletter_subscribers"("meepleId");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_manageToken_key" ON "newsletter_subscribers"("manageToken");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_dispatch_jobs_postId_subscriberId_key" ON "newsletter_dispatch_jobs"("postId", "subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "board_games_bggId_key" ON "board_games"("bggId");

-- CreateIndex
CREATE INDEX "board_games_ean_idx" ON "board_games"("ean");

-- CreateIndex
CREATE UNIQUE INDEX "game_copies_slug_key" ON "game_copies"("slug");

-- CreateIndex
CREATE INDEX "game_copies_boardGameId_idx" ON "game_copies"("boardGameId");

-- CreateIndex
CREATE INDEX "game_copies_status_idx" ON "game_copies"("status");

-- CreateIndex
CREATE INDEX "spare_part_listings_boardGameId_idx" ON "spare_part_listings"("boardGameId");

-- CreateIndex
CREATE INDEX "spare_part_listings_keeperMeepleId_idx" ON "spare_part_listings"("keeperMeepleId");

-- CreateIndex
CREATE INDEX "market_listings_sellerMeepleId_idx" ON "market_listings"("sellerMeepleId");

-- CreateIndex
CREATE INDEX "private_game_collection_entries_meepleId_idx" ON "private_game_collection_entries"("meepleId");

-- CreateIndex
CREATE UNIQUE INDEX "private_game_collection_entries_meepleId_boardGameId_key" ON "private_game_collection_entries"("meepleId", "boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "storage_units_code_key" ON "storage_units"("code");

-- CreateIndex
CREATE INDEX "storage_units_parentUnitId_idx" ON "storage_units"("parentUnitId");

-- CreateIndex
CREATE INDEX "storage_units_keeperMeepleId_idx" ON "storage_units"("keeperMeepleId");

-- CreateIndex
CREATE INDEX "storage_unit_moves_unitId_idx" ON "storage_unit_moves"("unitId");

-- CreateIndex
CREATE INDEX "game_holdings_gameCopyId_endedAt_idx" ON "game_holdings"("gameCopyId", "endedAt");

-- CreateIndex
CREATE INDEX "game_holdings_unitId_idx" ON "game_holdings"("unitId");

-- CreateIndex
CREATE INDEX "game_holdings_meepleId_idx" ON "game_holdings"("meepleId");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "shifts_eventId_idx" ON "shifts"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "explainer_games_meepleId_boardGameId_key" ON "explainer_games"("meepleId", "boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "flea_market_items_code_key" ON "flea_market_items"("code");

-- CreateIndex
CREATE INDEX "flea_market_items_eventId_idx" ON "flea_market_items"("eventId");

-- CreateIndex
CREATE INDEX "flea_market_items_sellerMeepleId_idx" ON "flea_market_items"("sellerMeepleId");

-- CreateIndex
CREATE UNIQUE INDEX "downloads_fileUrl_key" ON "downloads"("fileUrl");

-- CreateIndex
CREATE INDEX "downloads_status_idx" ON "downloads"("status");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_createdByMeepleId_fkey" FOREIGN KEY ("createdByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_postId_fkey" FOREIGN KEY ("postId") REFERENCES "lfg_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_accessedByMeepleId_fkey" FOREIGN KEY ("accessedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_subjectMeepleId_fkey" FOREIGN KEY ("subjectMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_dispatch_jobs" ADD CONSTRAINT "newsletter_dispatch_jobs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_dispatch_jobs" ADD CONSTRAINT "newsletter_dispatch_jobs_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_copies" ADD CONSTRAINT "game_copies_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_listings" ADD CONSTRAINT "spare_part_listings_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_listings" ADD CONSTRAINT "spare_part_listings_keeperMeepleId_fkey" FOREIGN KEY ("keeperMeepleId") REFERENCES "meeples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_sellerMeepleId_fkey" FOREIGN KEY ("sellerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_game_collection_entries" ADD CONSTRAINT "private_game_collection_entries_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_game_collection_entries" ADD CONSTRAINT "private_game_collection_entries_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_collections" ADD CONSTRAINT "game_collections_baseGameId_fkey" FOREIGN KEY ("baseGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_collections" ADD CONSTRAINT "game_collections_expansionId_fkey" FOREIGN KEY ("expansionId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_units" ADD CONSTRAINT "storage_units_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "storage_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_units" ADD CONSTRAINT "storage_units_keeperMeepleId_fkey" FOREIGN KEY ("keeperMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_unit_moves" ADD CONSTRAINT "storage_unit_moves_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "storage_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_unit_moves" ADD CONSTRAINT "storage_unit_moves_keeperMeepleId_fkey" FOREIGN KEY ("keeperMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_unit_moves" ADD CONSTRAINT "storage_unit_moves_recordedByMeepleId_fkey" FOREIGN KEY ("recordedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_gameCopyId_fkey" FOREIGN KEY ("gameCopyId") REFERENCES "game_copies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "storage_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_recordedByMeepleId_fkey" FOREIGN KEY ("recordedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_shelf_assignments" ADD CONSTRAINT "event_shelf_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_shelf_assignments" ADD CONSTRAINT "event_shelf_assignments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "storage_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_bookings" ADD CONSTRAINT "shift_bookings_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_bookings" ADD CONSTRAINT "shift_bookings_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainer_games" ADD CONSTRAINT "explainer_games_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainer_games" ADD CONSTRAINT "explainer_games_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainer_attendances" ADD CONSTRAINT "explainer_attendances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainer_attendances" ADD CONSTRAINT "explainer_attendances_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_sellerMeepleId_fkey" FOREIGN KEY ("sellerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
