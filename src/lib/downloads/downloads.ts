import { prisma } from "@/lib/utils/prisma";
import { tierAtLeast, type Tier } from "@/lib/utils/nav-config";

/** Public-facing by default — never surfaces OFFLINE downloads, and INTERNAL
 * only for signed-in members (analogous to `Post.internal`, see content.ts).
 * Sorted by the manual `order` field (see #113), not upload time. */
export async function listVisibleDownloads(tier: Tier) {
  return prisma.download.findMany({
    where: tierAtLeast(tier, "mitglied")
      ? { status: { in: ["PUBLIC", "INTERNAL"] } }
      : { status: "PUBLIC" },
    orderBy: { order: "asc" },
  });
}

/** OFFLINE downloads only — the private table below the main list, sorted
 * by last file change (see #201) since there is no manual order for hidden
 * downloads. */
export async function listOfflineDownloadsForAdmin() {
  return prisma.download.findMany({
    where: { status: "OFFLINE" },
    orderBy: { fileUpdatedAt: "desc" },
  });
}

const UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  let value = bytes / 1024;
  let unitIndex = 1;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${UNITS[unitIndex]}`;
}
