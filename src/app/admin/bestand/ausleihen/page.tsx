import { requireAdminPermission } from "@/lib/auth/session";
import { getActiveHoldingsByMeeple } from "@/lib/ludothek/holdings-by-meeple";
import { BorrowedGamesByMeepleView } from "@/components/feature/admin-bestand/borrowed-games-by-meeple-view";

export default async function AusleihenPage() {
  await requireAdminPermission("games:manage");

  const meeples = await getActiveHoldingsByMeeple();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <h1 className="font-serif text-2xl font-bold">Ausleihen nach Mitglied</h1>
      <BorrowedGamesByMeepleView meeples={meeples} />
    </div>
  );
}
