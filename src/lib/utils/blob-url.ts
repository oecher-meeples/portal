import { requireEnv } from "@/lib/utils/require-env";

/**
 * URL-Bausteine des S3-Blob-Speichers ohne SDK und ohne `server-only` (#112)
 * — die Prisma-Result-Extension (`lib/utils/prisma.ts`) signiert damit beim
 * Lesen, und die läuft auch in Seed-Skripten unter `tsx`. Client und Uploads
 * bleiben in `s3.ts`.
 *
 * Objects are addressed path-style (`<endpoint>/<bucket>/<key>`) against the
 * browser-facing `S3_PUBLIC_ENDPOINT` (falls back to `S3_ENDPOINT`, local dev).
 */
const DEFAULT_REGION = "us-east-1";

export function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export function getS3Bucket(): string {
  return requireEnv("S3_BUCKET");
}

/** Browser-facing endpoint — uploads, public URLs and signed GET URLs, whose
 * signature covers the host. */
export function publicBlobEndpoint(): string {
  return trimTrailingSlash(
    process.env.S3_PUBLIC_ENDPOINT || requireEnv("S3_ENDPOINT"),
  );
}

export function s3Region(): string {
  return process.env.S3_REGION || DEFAULT_REGION;
}

/** Origin browsers load blobs from and post uploads to — for the CSP
 * (`img-src`/`connect-src`). `null` when the store isn't configured, so a
 * missing env var never breaks page rendering. */
export function getBlobPublicOrigin(): string | null {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT;
  if (!endpoint) return null;
  try {
    return new URL(endpoint).origin;
  } catch {
    return null;
  }
}

/** Permanent URL of an object key — anonymously readable only under a
 * public prefix (#112); for private keys use `signedBlobUrl()`. */
export function publicUrlForKey(key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${publicBlobEndpoint()}/${getS3Bucket()}/${encodedKey}`;
}

/** Inverse of `publicUrlForKey()` — `null` for URLs outside our bucket
 * (e.g. legacy Vercel Blob URLs or external hotlinks). */
export function keyFromPublicUrl(url: string): string | null {
  const prefix = `${publicBlobEndpoint()}/${getS3Bucket()}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length).split(/[?#]/)[0];
  return key ? key.split("/").map(decodeURIComponent).join("/") : null;
}
