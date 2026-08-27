-- CreateTable
CREATE TABLE "helper_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grantsPermissionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helper_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "helper_roles_name_key" ON "helper_roles"("name");

-- Data migration (ADR-0012): seed HelperRole rows for the former ShiftType
-- enum values. "Kasse" keeps its flea-market rights via
-- grantsPermissionKey = "events:manage" — the same permission
-- hasFleaMarketRights already checks on the non-shift-booking path, so an
-- active Kasse shift booking grants it identically once shift-rights.ts is
-- generalized to hasRoleGrantedPermission (#154).
INSERT INTO "helper_roles" ("id", "name", "grantsPermissionKey", "updatedAt") VALUES
    ('helperrole-theke', 'Theke', NULL, CURRENT_TIMESTAMP),
    ('helperrole-kasse', 'Kasse', 'events:manage', CURRENT_TIMESTAMP),
    ('helperrole-leihe', 'Leihe', NULL, CURRENT_TIMESTAMP);

-- AlterTable: add roleId, backfill from the former "type" enum, then enforce
-- NOT NULL and drop "type"/the enum.
ALTER TABLE "shifts" ADD COLUMN "roleId" TEXT;

UPDATE "shifts" SET "roleId" = CASE "type"
    WHEN 'THEKE' THEN 'helperrole-theke'
    WHEN 'KASSE' THEN 'helperrole-kasse'
    WHEN 'LEIHE' THEN 'helperrole-leihe'
END;

ALTER TABLE "shifts" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "shifts" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ShiftType";

-- CreateIndex
CREATE INDEX "shifts_roleId_idx" ON "shifts"("roleId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "helper_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
