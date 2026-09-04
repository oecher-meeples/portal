import { prisma } from "@/lib/utils/prisma";

/**
 * Neon's included storage is 0.5 GB **per project**, shared across all
 * branches (this project has 2: Production and one preview branch) —
 * confirmed against Neon's docs (checked 2026-09-03). To leave headroom for
 * that shared usage, 0.4 GB is deliberately used as the conservative limit
 * here rather than the full 0.5 GB.
 *
 * `pg_database_size(current_database())` only measures the database of the
 * branch the query runs on — `/admin` runs against Production, so this
 * reflects Production's usage only, **not** the combined usage of both
 * branches. The UI must make that limitation visible (see
 * `neon-storage-usage-card.tsx`).
 */
const NEON_STORAGE_LIMIT_BYTES = 0.4 * 1024 * 1024 * 1024;

export type NeonStorageUsage = {
  /** Bytes used by the current branch's database (Production, see above). */
  used: number;
  /** Conservative per-project limit in bytes — see `NEON_STORAGE_LIMIT_BYTES`. */
  limit: number;
  /** `used / limit`, as a percentage (0-100+, may exceed 100 if over quota). */
  percent: number;
};

/** Fetches the current Neon Postgres storage usage via a single, cheap raw
 * query — on-demand, no cache layer needed (see #240, analogous reasoning
 * to `blob-storage.ts`: no extra token/scope, exact, documented). */
export async function getNeonStorageUsage(): Promise<NeonStorageUsage> {
  const [{ bytes }] = await prisma.$queryRaw<[{ bytes: bigint }]>`
    SELECT pg_database_size(current_database()) AS bytes
  `;
  const used = Number(bytes);

  return {
    used,
    limit: NEON_STORAGE_LIMIT_BYTES,
    percent: (used / NEON_STORAGE_LIMIT_BYTES) * 100,
  };
}
