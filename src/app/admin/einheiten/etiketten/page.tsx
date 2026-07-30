import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { UnitLabelSheet } from "@/components/feature/admin-einheiten/unit-label-sheet";

export default async function AdminEinheitenEtikettenPage() {
  await requirePermission("games:manage");

  const units = await prisma.storageUnit.findMany({
    where: { retiredAt: null },
    orderBy: { code: "asc" },
    select: { id: true, code: true, label: true, kind: true },
  });

  return <UnitLabelSheet units={units} />;
}
