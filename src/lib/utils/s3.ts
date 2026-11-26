import "server-only";
import { randomBytes } from "node:crypto";
import { posix } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { requireEnv } from "@/lib/utils/require-env";
import {
  getS3Bucket,
  publicBlobEndpoint,
  s3Region,
  trimTrailingSlash,
} from "@/lib/utils/blob-url";

export {
  getBlobPublicOrigin,
  getS3Bucket,
  keyFromPublicUrl,
  publicUrlForKey,
} from "@/lib/utils/blob-url";

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
 * wildcards. Anonymous read access exists only for the public prefixes in
 * `PUBLIC_BLOB_PREFIXES` (`blob-access.ts`, #112, set up by the
 * `seaweedfs-init` compose service via a standard S3 bucket policy); every
 * other object is stored by key and shown via `signedBlobUrl()`. The pure URL
 * helpers live in `blob-url.ts`.
 */
/** S3 client for server-side calls. `public: true` builds one against the
 * browser-facing endpoint — needed for presigned POSTs, whose URL the
 * browser calls directly (the POST-policy signature itself is host-independent). */
export function getS3Client({ public: usePublic = false } = {}): S3Client {
  return new S3Client({
    endpoint: usePublic
      ? publicBlobEndpoint()
      : trimTrailingSlash(requireEnv("S3_ENDPOINT")),
    region: s3Region(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("S3_SECRET_KEY"),
    },
  });
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
 * random suffix and returns the object key (#112) — public callers wrap it
 * in `publicUrlForKey()`, private ones store it as is. */
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
  return key;
}

/** Server-side read of a private object by key. Returns `null` when the
 * object does not exist. */
export async function getBlob(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: getS3Bucket(), Key: key }),
    );
    if (!result.Body) return null;
    return {
      bytes: await result.Body.transformToByteArray(),
      contentType: result.ContentType ?? "application/octet-stream",
    };
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") return null;
    throw error;
  }
}
