import { requireAdminPermission } from "@/lib/auth/session";
import { getActiveHoldingsByMeeple } from "@/lib/ludothek/holdings-by-meeple";
import { BorrowedGamesByMeepleView } from "@/components/feature/admin-bestand/borrowed-games-by-meeple-view";
import { PageTitle } from "@/components/ui/page-title";

export default async function AusleihenPage() {
  await requireAdminPermission("games:manage");

  const meeples = await getActiveHoldingsByMeeple();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <PageTitle size="sm">Ausleihen nach Mitglied</PageTitle>
      <BorrowedGamesByMeepleView meeples={meeples} canManageGames />
    </div>
  );
}
