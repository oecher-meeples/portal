import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client, keyFromPublicUrl } from "@/lib/utils/s3";

/** S3's DeleteObjects accepts at most 1000 keys per request. */
const MAX_KEYS_PER_REQUEST = 1000;

/**
 * Deletes uploaded files from the blob store. Blob URLs are reachable without
 * auth, so dropping only the database reference leaves the file public
 * forever — every path that removes an image reference must call this.
 *
 * Deleting an already-deleted object is a no-op, so a caller may safely retry.
 * URLs outside our bucket (legacy Vercel Blob URLs, external hotlinks) are
 * skipped — there is nothing of ours to delete.
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  const keys = urls
    .filter((url) => url.trim().length > 0)
    .map(keyFromPublicUrl)
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
