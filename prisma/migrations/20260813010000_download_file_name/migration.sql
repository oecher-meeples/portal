-- Persist the original uploaded file name (see #114) so admins can tell
-- files apart independent of the display title. Added nullable first,
-- backfilled from the existing blob URL's basename, then made required.
ALTER TABLE "downloads" ADD COLUMN "fileName" TEXT;

UPDATE "downloads" SET "fileName" = substring("fileUrl" from '[^/]+$');

ALTER TABLE "downloads" ALTER COLUMN "fileName" SET NOT NULL;
