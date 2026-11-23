-- #112: Private Dateien werden per Objekt-Key statt dauerhafter URL
-- gespeichert und nur noch signiert ausgeliefert. Spalten umbenennen und
-- eigene Bucket-URLs (`<endpoint>/<bucket>/<präfix>/…`) in Keys umwandeln.
-- Fremde URLs (Alt-URLs von Vercel Blob, externe Hotlinks) bleiben stehen;
-- `signedBlobUrl()` reicht sie unverändert durch.

-- Prozent-Dekodierung der Key-Segmente (`publicUrlForKey` kodiert jedes
-- Segment per encodeURIComponent). Nur für diese Migration, am Ende wieder
-- entfernt.
CREATE FUNCTION blob_key_from_url(input text) RETURNS text AS $$
DECLARE
  path text;
  bin bytea := ''::bytea;
  token text;
BEGIN
  IF input !~ '^https?://[^/]+/[^/]+/(downloads|market-listings|lfg-attachments|meeple-profile-pictures|important-links)/' THEN
    RETURN input;
  END IF;
  path := regexp_replace(input, '^https?://[^/]+/[^/]+/', '');
  path := regexp_replace(path, '[?#].*$', '');
  FOR token IN SELECT (regexp_matches(path, '%[0-9A-Fa-f]{2}|[^%]+|%', 'g'))[1] LOOP
    IF token ~ '^%[0-9A-Fa-f]{2}$' THEN
      bin := bin || decode(substr(token, 2, 2), 'hex');
    ELSE
      bin := bin || convert_to(token, 'UTF8');
    END IF;
  END LOOP;
  RETURN convert_from(bin, 'UTF8');
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Meeple.profilePictureUrl → profilePictureKey
ALTER TABLE "meeples" RENAME COLUMN "profilePictureUrl" TO "profilePictureKey";
UPDATE "meeples" SET "profilePictureKey" = blob_key_from_url("profilePictureKey")
  WHERE "profilePictureKey" IS NOT NULL;

-- LfgAttachment.url → key
ALTER TABLE "lfg_attachments" RENAME COLUMN "url" TO "key";
UPDATE "lfg_attachments" SET "key" = blob_key_from_url("key");

-- MarketListing.imageUrls → imageKeys
ALTER TABLE "market_listings" RENAME COLUMN "imageUrls" TO "imageKeys";
UPDATE "market_listings"
  SET "imageKeys" = ARRAY(
    SELECT blob_key_from_url(element)
    FROM unnest("imageKeys") WITH ORDINALITY AS t(element, position)
    ORDER BY position
  )
  WHERE cardinality("imageKeys") > 0;

-- Download.fileUrl → fileKey (inkl. Unique-Index nach Prisma-Namensschema)
ALTER TABLE "downloads" RENAME COLUMN "fileUrl" TO "fileKey";
ALTER INDEX "downloads_fileUrl_key" RENAME TO "downloads_fileKey_key";
UPDATE "downloads" SET "fileKey" = blob_key_from_url("fileKey");

-- ImportantLink.iconUrl → iconKey
ALTER TABLE "important_links" RENAME COLUMN "iconUrl" TO "iconKey";
UPDATE "important_links" SET "iconKey" = blob_key_from_url("iconKey")
  WHERE "iconKey" IS NOT NULL;

DROP FUNCTION blob_key_from_url(text);
