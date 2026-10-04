-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('BLOG', 'TERMIN', 'TURNIER', 'UMFRAGE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "InstagramStatus" AS ENUM ('PENDING', 'QUEUED', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "BankDataAccessKind" AS ENUM ('SINGLE_REVEAL', 'CSV_EXPORT');

-- CreateEnum
CREATE TYPE "GameInventoryStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DEINVENTARISED');

-- CreateEnum
CREATE TYPE "StorageUnitKind" AS ENUM ('BOX', 'SHELF', 'EVENT');

-- CreateEnum
CREATE TYPE "BoardGameKind" AS ENUM ('BOARDGAME', 'BOARDGAME_EXPANSION');

-- CreateEnum
CREATE TYPE "BoardGameTrait" AS ENUM ('LEGACY', 'CAMPAIGN', 'LIMITED_REPLAYABILITY', 'SOLITAIRE_SUPPORTED', 'DIGITAL_HYBRID');

-- CreateEnum
CREATE TYPE "BoardGameTraitTone" AS ENUM ('INFO', 'WARNING', 'DANGER');

-- CreateEnum
CREATE TYPE "ShelfCategory" AS ENUM ('ZWEI_PERSONEN', 'KINDER_FAMILIE', 'KENNERSPIELE', 'EXPERTENSPIELE', 'KOOPERATIV', 'PARTY');

-- CreateEnum
CREATE TYPE "LanguageDependence" AS ENUM ('NO_NECESSARY_TEXT', 'SOME_NECESSARY_TEXT', 'MODERATE_TEXT', 'EXTENSIVE_TEXT', 'UNPLAYABLE');

-- CreateEnum
CREATE TYPE "RuleBookLanguage" AS ENUM ('DE', 'EN', 'OTHER');

-- CreateEnum
CREATE TYPE "HoldingOrigin" AS ENUM ('INITIAL', 'LOAN', 'RETURN', 'HANDOVER', 'RELOCATION');

-- CreateEnum
CREATE TYPE "ExplainerExperienceLevel" AS ENUM ('WITH_MANUAL', 'WITHOUT_MANUAL', 'BY_HEART');

-- CreateEnum
CREATE TYPE "FleaMarketItemStatus" AS ENUM ('PENDING', 'FOR_SALE', 'RESERVED', 'SOLD', 'PAID_OUT', 'RETURNED', 'DONATED');

-- CreateEnum
CREATE TYPE "NewsletterCategory" AS ENUM ('TERMINE', 'NEWS', 'TURNIERE', 'BERICHTE');

-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "NewsletterDispatchStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PUBLIC', 'INTERNAL', 'OFFLINE');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'DRAFT');

-- CreateEnum
CREATE TYPE "ProfilePictureVisibility" AS ENUM ('INTERN', 'EVENTS', 'IMMER');

-- CreateEnum
CREATE TYPE "PendingChangeKind" AS ENUM ('IBAN', 'MEMBER_EMAIL', 'MEMBER_STAMMDATEN');

-- CreateEnum
CREATE TYPE "PrivateEventLoanStatus" AS ENUM ('OFFERED', 'LOANED', 'RETURNED');

-- CreateEnum
CREATE TYPE "SystemNotificationType" AS ENUM ('INFO', 'WARNING', 'DANGER');

-- CreateEnum
CREATE TYPE "SystemNotificationCloseable" AS ENUM ('NO', 'TEMPORARY', 'YES');

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
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

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
    "id" TEXT NOT NULL,
    "neonAuthUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeples" (
    "id" TEXT NOT NULL,
    "neonAuthUserId" TEXT,
    "memberNumber" SERIAL NOT NULL,
    "displayName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymizedAt" TIMESTAMP(3),
    "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
    "bggUsername" TEXT,
    "bgaUsername" TEXT,
    "telegramHandle" TEXT,
    "signalHandle" TEXT,
    "discordHandle" TEXT,
    "address" TEXT,
    "shareAddress" BOOLEAN NOT NULL DEFAULT false,
    "privateCollectionVisible" BOOLEAN NOT NULL DEFAULT false,
    "marketNewsletterOptIn" BOOLEAN NOT NULL DEFAULT false,
    "privateCollectionSyncedAt" TIMESTAMP(3),
    "doorbellNote" TEXT,
    "profilePictureUrl" TEXT,
    "profilePictureVisibility" "ProfilePictureVisibility" NOT NULL DEFAULT 'INTERN',
    "meepleDatenVisibility" "ProfilePictureVisibility" NOT NULL DEFAULT 'INTERN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "memberNumber" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "lastName" TEXT,
    "firstName" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "selbstgewaehlterBeitrag" DECIMAL(65,30),
    "ibanEncrypted" TEXT,
    "ibanFirst2" TEXT,
    "ibanLast4" TEXT,
    "accountHolder" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resignedAt" TIMESTAMP(3),
    "membershipEndsAt" TIMESTAMP(3),
    "meepleId" TEXT,
    "tshirtSizeId" TEXT,
    "calendarTokenHash" TEXT,
    "calendarTokenCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_guardians" (
    "childMemberId" TEXT NOT NULL,
    "guardianMemberId" TEXT NOT NULL,

    CONSTRAINT "member_guardians_pkey" PRIMARY KEY ("childMemberId","guardianMemberId")
);

-- CreateTable
CREATE TABLE "tshirt_sizes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tshirt_sizes_pkey" PRIMARY KEY ("id")
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
    "participantsMayEditLocation" BOOLEAN NOT NULL DEFAULT false,
    "maxParticipants" INTEGER NOT NULL,
    "createdByMeepleId" TEXT NOT NULL,
    "boardGameId" TEXT,
    "guestsMayBringGuests" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lfg_participants" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "meepleId" TEXT,
    "addedByMeepleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lfg_attachments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "uploadedByMeepleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_attachments_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "rate_limit_attempts" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "currentCooldownSecs" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFailedIp" TEXT,
    "manuallyLockedAt" TIMESTAMP(3),

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
    "sendAsNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "newsletterCategory" "NewsletterCategory",
    "newsletterStatus" "NewsletterDispatchStatus",
    "newsletterAttempts" INTEGER NOT NULL DEFAULT 0,
    "newsletterLastError" TEXT,
    "newsletterSentAt" TIMESTAMP(3),
    "sourceIcsUid" TEXT,
    "sourceEventId" TEXT,
    "syncedTitle" TEXT,
    "syncedLocationNote" TEXT,
    "syncedStartsAt" TIMESTAMP(3),
    "syncedEndsAt" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_instagram_details" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "status" "InstagramStatus" NOT NULL DEFAULT 'PENDING',
    "postUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "post_instagram_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_survey_details" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "editLink" TEXT,
    "analysisLink" TEXT,

    CONSTRAINT "post_survey_details_pkey" PRIMARY KEY ("id")
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
    "email" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresIn" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

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
    "newAccountHolder" TEXT,
    "fieldsJson" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmToken" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "pending_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bggId" INTEGER,
    "ean" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playTimeMinutes" INTEGER,
    "weight" DOUBLE PRECISION,
    "averageRating" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "description" TEXT,
    "mechanics" TEXT[],
    "categories" TEXT[],
    "explainerVideoUrl" TEXT,
    "kind" "BoardGameKind" NOT NULL DEFAULT 'BOARDGAME',
    "secondaryTitle" TEXT,
    "languageDependence" "LanguageDependence",
    "publisher" TEXT[],
    "author" TEXT[],
    "yearPublished" INTEGER,
    "traits" "BoardGameTrait"[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_game_trait_texts" (
    "trait" "BoardGameTrait" NOT NULL,
    "label" TEXT,
    "tooltip" TEXT,
    "tone" "BoardGameTraitTone" NOT NULL DEFAULT 'INFO',
    "loanMessage" TEXT,
    "detailsMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_game_trait_texts_pkey" PRIMARY KEY ("trait")
);

-- CreateTable
CREATE TABLE "board_game_alternate_names" (
    "id" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_game_alternate_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_copies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "condition" TEXT,
    "ruleBookLanguages" "RuleBookLanguage"[],
    "needsCompletenessCheck" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "inventoryNumber" TEXT,
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
    "boardGameId" TEXT,
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
    "rating" DOUBLE PRECISION,
    "forTrade" BOOLEAN NOT NULL DEFAULT false,
    "wantToPlay" BOOLEAN NOT NULL DEFAULT false,

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
    "category" "ShelfCategory",
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
    "vereinsmitgliedId" TEXT,
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
    "hasBringAndBuyMarket" BOOLEAN NOT NULL DEFAULT false,
    "helpersWanted" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "EventVisibility" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_days" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_shelf_assignments" (
    "eventId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "event_shelf_assignments_pkey" PRIMARY KEY ("eventId","unitId")
);

-- CreateTable
CREATE TABLE "helper_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grantsPermissionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helper_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helper_availabilities" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helper_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helper_availability_roles" (
    "availabilityId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "helper_availability_roles_pkey" PRIMARY KEY ("availabilityId","roleId")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "targetStartsAt" TIMESTAMP(3) NOT NULL,
    "targetEndsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_bookings" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "slotIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_bookings_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "private_event_loans" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ownerMeepleId" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "status" "PrivateEventLoanStatus" NOT NULL DEFAULT 'OFFERED',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),
    "issuedByMeepleId" TEXT,
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "private_event_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flea_market_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sellerMeepleId" TEXT,
    "externalSellerId" TEXT,
    "title" TEXT NOT NULL,
    "language" TEXT,
    "description" TEXT,
    "priceEuros" INTEGER NOT NULL,
    "status" "FleaMarketItemStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedByMeepleId" TEXT,
    "cartId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flea_market_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flea_market_external_sellers" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flea_market_external_sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flea_market_carts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flea_market_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PUBLIC',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "pdfFileUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "important_links" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "important_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_notifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SystemNotificationType" NOT NULL,
    "audiencePermissionKey" TEXT,
    "closeable" "SystemNotificationCloseable" NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automated_notification_disables" (
    "name" TEXT NOT NULL,
    "disabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automated_notification_disables_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "browser" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_neonAuthUserId_roleId_startsAt_key" ON "user_roles"("neonAuthUserId", "roleId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "meeples_neonAuthUserId_key" ON "meeples"("neonAuthUserId");

-- CreateIndex
CREATE UNIQUE INDEX "meeples_memberNumber_key" ON "meeples"("memberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "members_memberNumber_key" ON "members"("memberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "members_slug_key" ON "members"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_meepleId_key" ON "members"("meepleId");

-- CreateIndex
CREATE UNIQUE INDEX "members_calendarTokenHash_key" ON "members"("calendarTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "tshirt_sizes_label_key" ON "tshirt_sizes"("label");

-- CreateIndex
CREATE INDEX "deletion_requests_meepleId_idx" ON "deletion_requests"("meepleId");

-- CreateIndex
CREATE INDEX "deletion_requests_handledAt_idx" ON "deletion_requests"("handledAt");

-- CreateIndex
CREATE INDEX "lfg_posts_createdByMeepleId_idx" ON "lfg_posts"("createdByMeepleId");

-- CreateIndex
CREATE INDEX "lfg_posts_boardGameId_idx" ON "lfg_posts"("boardGameId");

-- CreateIndex
CREATE INDEX "lfg_participants_postId_idx" ON "lfg_participants"("postId");

-- CreateIndex
CREATE INDEX "lfg_participants_meepleId_idx" ON "lfg_participants"("meepleId");

-- CreateIndex
CREATE INDEX "lfg_participants_addedByMeepleId_idx" ON "lfg_participants"("addedByMeepleId");

-- CreateIndex
CREATE UNIQUE INDEX "lfg_participants_postId_meepleId_key" ON "lfg_participants"("postId", "meepleId");

-- CreateIndex
CREATE INDEX "lfg_attachments_postId_idx" ON "lfg_attachments"("postId");

-- CreateIndex
CREATE INDEX "lfg_attachments_uploadedByMeepleId_idx" ON "lfg_attachments"("uploadedByMeepleId");

-- CreateIndex
CREATE INDEX "bank_data_access_logs_at_idx" ON "bank_data_access_logs"("at");

-- CreateIndex
CREATE INDEX "bank_data_access_logs_subjectMeepleId_idx" ON "bank_data_access_logs"("subjectMeepleId");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_attempts_key_key" ON "rate_limit_attempts"("key");

-- CreateIndex
CREATE INDEX "login_logs_neonAuthUserId_idx" ON "login_logs"("neonAuthUserId");

-- CreateIndex
CREATE INDEX "login_logs_at_idx" ON "login_logs"("at");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "posts_sourceIcsUid_key" ON "posts"("sourceIcsUid");

-- CreateIndex
CREATE UNIQUE INDEX "posts_sourceEventId_key" ON "posts"("sourceEventId");

-- CreateIndex
CREATE INDEX "posts_type_internal_date_idx" ON "posts"("type", "internal", "date");

-- CreateIndex
CREATE UNIQUE INDEX "post_instagram_details_postId_key" ON "post_instagram_details"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_survey_details_postId_key" ON "post_survey_details"("postId");

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
CREATE UNIQUE INDEX "pending_changes_confirmToken_key" ON "pending_changes"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "board_games_slug_key" ON "board_games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "board_games_bggId_key" ON "board_games"("bggId");

-- CreateIndex
CREATE INDEX "board_games_ean_idx" ON "board_games"("ean");

-- CreateIndex
CREATE INDEX "board_game_alternate_names_boardGameId_idx" ON "board_game_alternate_names"("boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "game_copies_slug_key" ON "game_copies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "game_copies_inventoryNumber_key" ON "game_copies"("inventoryNumber");

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
CREATE INDEX "market_listings_boardGameId_idx" ON "market_listings"("boardGameId");

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
CREATE INDEX "game_holdings_vereinsmitgliedId_idx" ON "game_holdings"("vereinsmitgliedId");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "event_days_eventId_date_key" ON "event_days"("eventId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "helper_roles_name_key" ON "helper_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "helper_availabilities_meepleId_dayId_key" ON "helper_availabilities"("meepleId", "dayId");

-- CreateIndex
CREATE INDEX "shifts_eventId_idx" ON "shifts"("eventId");

-- CreateIndex
CREATE INDEX "shifts_dayId_idx" ON "shifts"("dayId");

-- CreateIndex
CREATE INDEX "shifts_roleId_idx" ON "shifts"("roleId");

-- CreateIndex
CREATE INDEX "shift_bookings_shiftId_meepleId_idx" ON "shift_bookings"("shiftId", "meepleId");

-- CreateIndex
CREATE UNIQUE INDEX "explainer_games_meepleId_boardGameId_key" ON "explainer_games"("meepleId", "boardGameId");

-- CreateIndex
CREATE INDEX "private_event_loans_eventId_status_idx" ON "private_event_loans"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "private_event_loans_eventId_ownerMeepleId_boardGameId_key" ON "private_event_loans"("eventId", "ownerMeepleId", "boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "flea_market_items_code_key" ON "flea_market_items"("code");

-- CreateIndex
CREATE INDEX "flea_market_items_eventId_idx" ON "flea_market_items"("eventId");

-- CreateIndex
CREATE INDEX "flea_market_items_sellerMeepleId_idx" ON "flea_market_items"("sellerMeepleId");

-- CreateIndex
CREATE INDEX "flea_market_items_externalSellerId_idx" ON "flea_market_items"("externalSellerId");

-- CreateIndex
CREATE INDEX "flea_market_items_cartId_idx" ON "flea_market_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "flea_market_external_sellers_token_key" ON "flea_market_external_sellers"("token");

-- CreateIndex
CREATE INDEX "flea_market_external_sellers_eventId_idx" ON "flea_market_external_sellers"("eventId");

-- CreateIndex
CREATE INDEX "flea_market_carts_eventId_idx" ON "flea_market_carts"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "downloads_fileUrl_key" ON "downloads"("fileUrl");

-- CreateIndex
CREATE INDEX "downloads_status_idx" ON "downloads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_slug_key" ON "legal_documents"("slug");

-- CreateIndex
CREATE INDEX "page_views_createdAt_idx" ON "page_views"("createdAt");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_tshirtSizeId_fkey" FOREIGN KEY ("tshirtSizeId") REFERENCES "tshirt_sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_guardians" ADD CONSTRAINT "member_guardians_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_guardians" ADD CONSTRAINT "member_guardians_guardianMemberId_fkey" FOREIGN KEY ("guardianMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_createdByMeepleId_fkey" FOREIGN KEY ("createdByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_postId_fkey" FOREIGN KEY ("postId") REFERENCES "lfg_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_addedByMeepleId_fkey" FOREIGN KEY ("addedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_attachments" ADD CONSTRAINT "lfg_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "lfg_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_attachments" ADD CONSTRAINT "lfg_attachments_uploadedByMeepleId_fkey" FOREIGN KEY ("uploadedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_accessedByMeepleId_fkey" FOREIGN KEY ("accessedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_subjectMeepleId_fkey" FOREIGN KEY ("subjectMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_instagram_details" ADD CONSTRAINT "post_instagram_details_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_survey_details" ADD CONSTRAINT "post_survey_details_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_dispatch_jobs" ADD CONSTRAINT "newsletter_dispatch_jobs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_dispatch_jobs" ADD CONSTRAINT "newsletter_dispatch_jobs_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_changes" ADD CONSTRAINT "pending_changes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_game_alternate_names" ADD CONSTRAINT "board_game_alternate_names_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_copies" ADD CONSTRAINT "game_copies_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_listings" ADD CONSTRAINT "spare_part_listings_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_listings" ADD CONSTRAINT "spare_part_listings_keeperMeepleId_fkey" FOREIGN KEY ("keeperMeepleId") REFERENCES "meeples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_sellerMeepleId_fkey" FOREIGN KEY ("sellerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_vereinsmitgliedId_fkey" FOREIGN KEY ("vereinsmitgliedId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_recordedByMeepleId_fkey" FOREIGN KEY ("recordedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_days" ADD CONSTRAINT "event_days_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_shelf_assignments" ADD CONSTRAINT "event_shelf_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_shelf_assignments" ADD CONSTRAINT "event_shelf_assignments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "storage_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helper_availabilities" ADD CONSTRAINT "helper_availabilities_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helper_availabilities" ADD CONSTRAINT "helper_availabilities_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "event_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helper_availability_roles" ADD CONSTRAINT "helper_availability_roles_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "helper_availabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helper_availability_roles" ADD CONSTRAINT "helper_availability_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "helper_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "event_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "helper_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_ownerMeepleId_fkey" FOREIGN KEY ("ownerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_issuedByMeepleId_fkey" FOREIGN KEY ("issuedByMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_sellerMeepleId_fkey" FOREIGN KEY ("sellerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_externalSellerId_fkey" FOREIGN KEY ("externalSellerId") REFERENCES "flea_market_external_sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "flea_market_carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_external_sellers" ADD CONSTRAINT "flea_market_external_sellers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_carts" ADD CONSTRAINT "flea_market_carts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
