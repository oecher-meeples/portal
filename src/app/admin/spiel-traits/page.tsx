import { requireAdminPermission } from "@/lib/auth/session";
import { listBoardGameTraitTexts } from "@/lib/ludothek/board-game-trait-texts";
import { BoardGameTraitTextsView } from "@/components/feature/admin-settings/board-game-trait-texts-view";

export default async function AdminSpielTraitsPage() {
  await requireAdminPermission("games:manage");
  const rows = await listBoardGameTraitTexts();

  return <BoardGameTraitTextsView rows={rows} />;
}
