-- CreateEnum
CREATE TYPE "SystemNotificationType" AS ENUM ('INFO', 'WARNING', 'DANGER');

-- CreateEnum
CREATE TYPE "SystemNotificationCloseable" AS ENUM ('NO', 'TEMPORARY', 'YES');

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
