import { del } from "@vercel/blob";

/**
 * Deletes uploaded files from Vercel Blob. Blob URLs are reachable without
 * auth, so dropping only the database reference leaves the file public
 * forever — every path that removes an image reference must call this.
 *
 * Deleting an already-deleted blob is a no-op, so a caller may safely retry.
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  const targets = urls.filter((url) => url.trim().length > 0);
  if (targets.length === 0) return;

  await del(targets);
}
