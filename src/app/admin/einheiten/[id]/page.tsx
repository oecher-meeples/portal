import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { ensureMeeple, getMembershipState } from "@/lib/members/meeples";
import { UnitDetailView } from "@/components/feature/admin-einheiten/unit-detail-view";
import { formatDateTime } from "@/lib/utils/format";

export default async function AdminEinheitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const [currentMeeple, isAdmin] = await Promise.all([
    ensureMeeple(user),
    hasPermission(user.id, "games:manage"),
  ]);
  const { id } = await params;

  const [unit, meeples] = await Promise.all([
    prisma.storageUnit.findUnique({
      where: { id },
      include: { keeper: { select: { displayName: true } } },
    }),
    prisma.meeple.findMany(),
  ]);
  if (!unit) {
    notFound();
  }

  const [contents, moves] = await Promise.all([
    prisma.gameCopy.findMany({
      where: { holdings: { some: { unitId: unit.id, endedAt: null } } },
      select: { id: true, slug: true, boardGame: { select: { title: true } } },
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

  const keeperOptions = meeples
    .filter((m) => getMembershipState(m) !== "anonymisiert")
    .map((m) => ({ id: m.id, displayName: m.displayName }));

  return (
    <UnitDetailView
      unit={{
        id: unit.id,
        code: unit.code,
        // Event-Units (#273) sind system-verwaltet und werden hier nicht
        // verlinkt — direkt aufgerufen zeigt diese Detailseite sie
        // pragmatisch als "Regal" an, statt eine dritte Anzeigevariante
        // für einen Pfad zu bauen, der praktisch nicht vorkommt.
        kind: unit.kind as "BOX" | "SHELF",
        label: unit.label,
        locationNote: unit.locationNote,
        keeperMeepleId: unit.keeperMeepleId,
        keeperName: unit.keeper?.displayName ?? null,
        retired: unit.retiredAt !== null,
      }}
      contents={contents.map((copy) => ({
        id: copy.id,
        title: copy.boardGame.title,
        slug: copy.slug,
      }))}
      moves={moves.map((move) => ({
        id: move.id,
        startedAt: formatDateTime(move.startedAt),
        endedAt: move.endedAt ? formatDateTime(move.endedAt) : null,
        keeperName: move.keeper?.displayName ?? null,
        locationNote: move.locationNote,
        recordedByName: move.recordedBy.displayName,
      }))}
      isAdmin={isAdmin}
      selfMeepleId={currentMeeple.id}
      keeperOptions={keeperOptions}
    />
  );
}
