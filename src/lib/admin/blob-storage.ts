import { list } from "@vercel/blob";
import { requireEnv } from "@/lib/utils/require-env";

/**
 * Vercel's Blob REST API has no endpoint that returns numeric storage usage.
 * The documented `GET /storage/stores/{id}` endpoint
 * (https://vercel.com/docs/rest-api/storage/get-a-store, checked 2026-08-25)
 * only returns a boolean `usageQuotaExceeded` flag and a `status` enum — no
 * used/limit byte counts, and no other REST endpoint exposes them either
 * (confirmed against the full endpoint listing and the OpenAPI spec).
 *
 * So this sums the `size` of every blob via the `@vercel/blob` SDK's
 * `list()` instead, using the same read-write token the app already uses
 * for uploads (`BLOB_READ_WRITE_TOKEN`, see `use-blob-upload.ts`) — that is
 * exact, documented, and needs no extra token/scope.
 *
 * The included-storage limit (5 GB) is likewise not exposed by any API; it
 * is Vercel's documented Hobby/Pro included storage volume, see the pricing
 * example on https://vercel.com/docs/vercel-blob/usage-and-pricing
 * ("50 GB total - 5 GB included"). This club project runs on Hobby
 * (docs/kostenanalyse.md), so 5 GB is the correct limit for the percentage.
 */
const INCLUDED_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;

/** Warning stage for the current fill level. How each stage *looks* (colour)
 * is a display concern and lives in `components/entities/*` instead. */
export type BlobStorageTone = "ok" | "warning" | "critical";

/** Pure threshold rule: ok below 80%, warning 80–94%, critical from 95%. */
export function getBlobStorageTone(percent: number): BlobStorageTone {
  if (percent >= 95) return "critical";
  if (percent >= 80) return "warning";
  return "ok";
}

export type BlobStorageUsage = {
  /** Total bytes currently stored across all blobs. */
  used: number;
  /** Included storage volume in bytes (Hobby/Pro plan default). */
  limit: number;
  /** `used / limit`, as a percentage (0-100+, may exceed 100 if over quota). */
  percent: number;
};

/** Fetches the current Vercel Blob storage usage by paginating through
 * every stored blob and summing their sizes. */
export async function getBlobStorageUsage(): Promise<BlobStorageUsage> {
  const token = requireEnv("BLOB_READ_WRITE_TOKEN");

  let used = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ token, cursor, limit: 1000 });
    used += page.blobs.reduce((sum, blob) => sum + blob.size, 0);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return {
    used,
    limit: INCLUDED_STORAGE_BYTES,
    percent: (used / INCLUDED_STORAGE_BYTES) * 100,
  };
}
