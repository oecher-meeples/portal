import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { UnitLabelSheet } from "@/components/feature/admin-einheiten/unit-label-sheet";

export default async function AdminEinheitenEtikettenPage() {
  await requirePermission("games:manage");

  // EVENT-Units sind system-verwaltet (#273) und brauchen keine Etiketten.
  const units = await prisma.storageUnit.findMany({
    where: { retiredAt: null, kind: { not: "EVENT" } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, label: true, kind: true },
  });

  return (
    <UnitLabelSheet
      units={units.map((unit) => ({
        ...unit,
        kind: unit.kind as "BOX" | "SHELF",
      }))}
    />
  );
}
