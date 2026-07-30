import type { Prisma } from "@prisma/client";
import { UNSORTIERT_CODE } from "@/lib/inventory/codes";

export type AdminBestandFilter =
  "ungeprueft" | "mangel" | "nicht-erfasst" | null;

export function boardGameAdminWhere({
  showDeinventarised = false,
  filter = null,
}: {
  showDeinventarised?: boolean;
  filter?: AdminBestandFilter;
} = {}): Prisma.BoardGameWhereInput {
  const conditions: Prisma.BoardGameWhereInput[] = [];

  if (!showDeinventarised) {
    conditions.push({ status: { not: "DEINVENTARISED" } });
  }
  if (filter === "ungeprueft") {
    conditions.push({ needsCompletenessCheck: true });
  }
  if (filter === "mangel") {
    conditions.push({ status: "MAINTENANCE" });
  }
  if (filter === "nicht-erfasst") {
    conditions.push({
      holdings: { some: { endedAt: null, unit: { code: UNSORTIERT_CODE } } },
    });
  }

  if (conditions.length === 0) return {};
  return { AND: conditions };
}
