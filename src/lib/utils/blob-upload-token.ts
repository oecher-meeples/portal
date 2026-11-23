import "server-only";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getS3Bucket, getS3Client, withRandomSuffix } from "@/lib/utils/s3";
import { signedBlobUrl } from "@/lib/utils/blob-access";

/** Lifetime of an upload grant — enough for one large file on a slow
 * connection, short enough that a leaked grant is useless soon after. */
const UPLOAD_TOKEN_TTL_SECONDS = 10 * 60;

/** What a feature's `get…UploadToken` server action returns to
 * `useBlobUpload()`: an S3 presigned POST (form `url` + signed `fields`)
 * plus the URL to show the object once uploaded. Plain JSON, so it crosses
 * the server-action boundary. */
export type BlobUploadToken = {
  url: string;
  fields: Record<string, string>;
  /** Permanent URL for `PUBLIC_BLOB_PREFIXES`, a short-lived signed URL for
   * every private prefix (#112). The saving action turns it back into the
   * key via `requireBlobKeyUnder()`. */
  viewUrl: string;
};

export type BlobUploadTokenOptions = {
  /** Already normalised via `normaliseBlobPath()`. */
  pathname: string;
  /** MIME type the client declared for the file — signed into the policy,
   * so S3/SeaweedFS rejects an upload with any other `Content-Type`. */
  contentType: string;
  /** Omit for "any type" (downloads, LFG attachments). */
  allowedContentTypes?: string[];
  addRandomSuffix?: boolean;
  maximumSizeInBytes: number;
};

/**
 * Server-side upload grant, the S3 counterpart of Vercel Blob's
 * `generateClientTokenFromReadWriteToken()`. A presigned POST (not PUT) on
 * purpose: its policy conditions make the S3-compatible store itself enforce the size limit
 * (`content-length-range`) and the content type — a presigned PUT can't cap
 * the size, so a member could upload arbitrarily large files.
 */
export async function createBlobUploadToken({
  pathname,
  contentType,
  allowedContentTypes,
  addRandomSuffix = false,
  maximumSizeInBytes,
}: BlobUploadTokenOptions): Promise<BlobUploadToken> {
  if (allowedContentTypes && !allowedContentTypes.includes(contentType)) {
    throw new Error(
      `Dateityp ${contentType || "(unbekannt)"} ist nicht erlaubt.`,
    );
  }

  const key = addRandomSuffix ? withRandomSuffix(pathname) : pathname;
  const { url, fields } = await createPresignedPost(
    getS3Client({ public: true }),
    {
      Bucket: getS3Bucket(),
      Key: key,
      Conditions: [
        ["content-length-range", 0, maximumSizeInBytes],
        ["eq", "$Content-Type", contentType],
      ],
      Fields: { "Content-Type": contentType },
      Expires: UPLOAD_TOKEN_TTL_SECONDS,
    },
  );

  return { url, fields, viewUrl: signedBlobUrl(key) };
}
