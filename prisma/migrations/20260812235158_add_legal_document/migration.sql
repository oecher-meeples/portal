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

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_slug_key" ON "legal_documents"("slug");
