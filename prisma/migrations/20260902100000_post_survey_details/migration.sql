-- AlterEnum
ALTER TYPE "PostType" ADD VALUE 'UMFRAGE';

-- CreateTable
CREATE TABLE "post_survey_details" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "editLink" TEXT,
    "analysisLink" TEXT,

    CONSTRAINT "post_survey_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_survey_details_postId_key" ON "post_survey_details"("postId");

-- AddForeignKey
ALTER TABLE "post_survey_details" ADD CONSTRAINT "post_survey_details_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
