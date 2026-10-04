import "server-only";
import { randomBytes } from "node:crypto";
import { posix } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "@/lib/utils/require-env";

/**
 * Shared access to the S3-compatible blob store (self-hosted SeaweedFS, see
 * docker-compose.yml and docs/deployment-docker.md). Replaces `@vercel/blob`.
 *
 * Two endpoints on purpose: the app talks to `S3_ENDPOINT` (inside Docker
 * e.g. `http://seaweedfs:8333`), while browsers load images and post uploads
 * to `S3_PUBLIC_ENDPOINT` (e.g. `https://files.oecher-meeples.org`). Without
 * a separate public endpoint both are the same URL (local dev).
 *
 * Objects are addressed path-style (`<endpoint>/<bucket>/<key>`) — SeaweedFS
 * needs `forcePathStyle`, and it keeps the public URL independent of DNS
 * wildcards. The bucket has anonymous read access (set up by the
 * `seaweedfs-init` compose service via a standard S3 bucket policy — unlike
 * MinIO, SeaweedFS has no root console user to grant/restrict this with), so
 * the public URL is the permanent URL stored in the database, just like the
 * former Vercel Blob URLs.
 */
const DEFAULT_REGION = "us-east-1";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export function getS3Bucket(): string {
  return requireEnv("S3_BUCKET");
}

function getPublicEndpoint(): string {
  return trimTrailingSlash(
    process.env.S3_PUBLIC_ENDPOINT || requireEnv("S3_ENDPOINT"),
  );
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

/** S3 client for server-side calls. `public: true` builds one against the
 * browser-facing endpoint — needed for presigned POSTs, whose URL the
 * browser calls directly (the POST-policy signature itself is host-independent). */
export function getS3Client({ public: usePublic = false } = {}): S3Client {
  return new S3Client({
    endpoint: usePublic
      ? getPublicEndpoint()
      : trimTrailingSlash(requireEnv("S3_ENDPOINT")),
    region: process.env.S3_REGION || DEFAULT_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("S3_SECRET_KEY"),
    },
  });
}

/** Public, anonymously readable URL of an object key. */
export function publicUrlForKey(key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${getPublicEndpoint()}/${getS3Bucket()}/${encodedKey}`;
}

/** Inverse of `publicUrlForKey()` — `null` for URLs outside our bucket
 * (e.g. legacy Vercel Blob URLs or external hotlinks). */
export function keyFromPublicUrl(url: string): string | null {
  const prefix = `${getPublicEndpoint()}/${getS3Bucket()}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length).split(/[?#]/)[0];
  return key ? key.split("/").map(decodeURIComponent).join("/") : null;
}

/** `foo/bar.png` → `foo/bar-<random>.png`, same as Vercel Blob's
 * `addRandomSuffix`, so two uploads with the same file name never overwrite
 * each other. */
export function withRandomSuffix(pathname: string): string {
  const { dir, name, ext } = posix.parse(pathname);
  const suffix = randomBytes(8).toString("base64url");
  return posix.join(dir, `${name}-${suffix}${ext}`);
}

/** Server-side upload (e.g. generated or re-hosted images). Always adds a
 * random suffix and returns the public URL. */
export async function putBlob(
  pathname: string,
  body: Uint8Array | ArrayBuffer | Buffer,
  contentType: string,
): Promise<string> {
  const key = withRandomSuffix(pathname);
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
      Body: body instanceof ArrayBuffer ? new Uint8Array(body) : body,
      ContentType: contentType,
    }),
  );
  return publicUrlForKey(key);
}
