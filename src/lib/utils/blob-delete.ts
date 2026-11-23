import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client } from "@/lib/utils/s3";
import { blobKeyFrom } from "@/lib/utils/blob-access";

/** S3's DeleteObjects accepts at most 1000 keys per request. */
const MAX_KEYS_PER_REQUEST = 1000;

/**
 * Deletes uploaded files from the blob store. Dropping only the database
 * reference would leave the file behind (and public-prefix files readable
 * forever) — every path that removes a file reference must call this.
 *
 * Takes stored references — object keys (#112) or legacy/public URLs.
 * Deleting an already-deleted object is a no-op, so a caller may safely retry.
 * URLs outside our bucket (legacy Vercel Blob URLs, external hotlinks) are
 * skipped — there is nothing of ours to delete.
 */
export async function deleteBlobs(refs: string[]): Promise<void> {
  const keys = refs
    .map(blobKeyFrom)
    .filter((key): key is string => key !== null);
  if (keys.length === 0) return;

  const client = getS3Client();
  for (let i = 0; i < keys.length; i += MAX_KEYS_PER_REQUEST) {
    const batch = keys.slice(i, i + MAX_KEYS_PER_REQUEST);
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: getS3Bucket(),
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    // DeleteObjects reports per-key failures in the body with HTTP 200 —
    // surface them so the caller keeps the reference and can retry.
    const failed = result.Errors?.[0];
    if (failed) {
      throw new Error(
        `Blob ${failed.Key} konnte nicht gelöscht werden: ${failed.Message ?? failed.Code}`,
      );
    }
  }
}
