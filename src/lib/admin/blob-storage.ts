import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client } from "@/lib/utils/s3";

/**
 * Soft quota for the admin dashboard's fill-level card. The self-hosted
 * blob store (SeaweedFS, see docker-compose.yml) has no plan limit — it is bounded only
 * by the host's disk — so this keeps the 1 GB the club had on Vercel Blob as
 * the "time to clean up" reference value. Override with
 * `S3_STORAGE_LIMIT_BYTES` once the server's disk budget is known.
 */
const DEFAULT_STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024;

function getStorageLimitBytes(): number {
  const configured = Number(process.env.S3_STORAGE_LIMIT_BYTES);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_STORAGE_LIMIT_BYTES;
}

export type BlobStorageUsage = {
  /** Total bytes currently stored across all blobs. */
  used: number;
  /** Soft quota in bytes (see `S3_STORAGE_LIMIT_BYTES`). */
  limit: number;
  /** `used / limit`, as a percentage (0-100+, may exceed 100 if over quota). */
  percent: number;
};

/** Fetches the current blob storage usage by paginating through every
 * object in the bucket and summing their sizes — S3 has no "bucket size"
 * call, and the store's own API would need extra credentials/scope. */
export async function getBlobStorageUsage(): Promise<BlobStorageUsage> {
  const client = getS3Client();
  const bucket = getS3Bucket();

  let used = 0;
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );
    used += (page.Contents ?? []).reduce(
      (sum, object) => sum + (object.Size ?? 0),
      0,
    );
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  const limit = getStorageLimitBytes();
  return { used, limit, percent: (used / limit) * 100 };
}
