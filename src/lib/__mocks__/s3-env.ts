import { vi } from "vitest";

export const TEST_S3_PUBLIC_ENDPOINT = "https://files.example.org";
export const TEST_S3_BUCKET = "meeples";
/** Public URL prefix of every object in the test bucket. */
export const TEST_S3_PUBLIC_BASE = `${TEST_S3_PUBLIC_ENDPOINT}/${TEST_S3_BUCKET}`;

/** Sets the `S3_*` env vars `lib/utils/s3.ts` reads. Pair with
 * `vi.unstubAllEnvs()` (or rely on `unstubEnvs` config) to reset. */
export function stubS3Env() {
  vi.stubEnv("S3_ENDPOINT", "http://seaweedfs:8333");
  vi.stubEnv("S3_PUBLIC_ENDPOINT", TEST_S3_PUBLIC_ENDPOINT);
  vi.stubEnv("S3_REGION", "us-east-1");
  vi.stubEnv("S3_BUCKET", TEST_S3_BUCKET);
  vi.stubEnv("S3_ACCESS_KEY", "test-access-key");
  vi.stubEnv("S3_SECRET_KEY", "test-secret-key");
}
