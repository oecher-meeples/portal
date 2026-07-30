import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { UnitDetailView } from "@/components/feature/admin-einheiten/unit-detail-view";
import { formatDateTime } from "@/lib/utils/format";

export default async function AdminEinheitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("games:manage");
  const { id } = await params;

  const unit = await prisma.storageUnit.findUnique({
    where: { id },
    include: { keeper: { select: { displayName: true } } },
  });
  if (!unit) {
    notFound();
  }

  const [contents, moves] = await Promise.all([
    prisma.boardGame.findMany({
      where: { holdings: { some: { unitId: unit.id, endedAt: null } } },
      select: { id: true, title: true, slug: true },
    }),
    prisma.storageUnitMove.findMany({
      where: { unitId: unit.id },
      orderBy: { startedAt: "desc" },
      include: {
        keeper: { select: { displayName: true } },
        recordedBy: { select: { displayName: true } },
      },
    }),
  ]);

  return (
    <UnitDetailView
      unit={{
        id: unit.id,
        code: unit.code,
        kind: unit.kind,
        label: unit.label,
        locationNote: unit.locationNote,
        keeperName: unit.keeper?.displayName ?? null,
        retired: unit.retiredAt !== null,
      }}
      contents={contents}
      moves={moves.map((move) => ({
        id: move.id,
        startedAt: formatDateTime(move.startedAt),
        endedAt: move.endedAt ? formatDateTime(move.endedAt) : null,
        keeperName: move.keeper?.displayName ?? null,
        locationNote: move.locationNote,
        recordedByName: move.recordedBy.displayName,
      }))}
    />
  );
}
