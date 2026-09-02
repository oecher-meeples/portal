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

    CONSTRAINT "helper_availability_roles_pkey" PRIMARY KEY ("availabilityId", "roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "helper_availabilities_meepleId_dayId_key" ON "helper_availabilities"("meepleId", "dayId");

-- AddForeignKey
ALTER TABLE "helper_availabilities" ADD CONSTRAINT "helper_availabilities_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helper_availabilities" ADD CONSTRAINT "helper_availabilities_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "event_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helper_availability_roles" ADD CONSTRAINT "helper_availability_roles_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "helper_availabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helper_availability_roles" ADD CONSTRAINT "helper_availability_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "helper_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
