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
