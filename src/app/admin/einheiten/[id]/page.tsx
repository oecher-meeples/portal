import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { UnitDetailView } from "@/components/feature/admin-einheiten/unit-detail-view";

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

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
        startedAt: dateTime.format(move.startedAt),
        endedAt: move.endedAt ? dateTime.format(move.endedAt) : null,
        keeperName: move.keeper?.displayName ?? null,
        locationNote: move.locationNote,
        recordedByName: move.recordedBy.displayName,
      }))}
    />
  );
}
