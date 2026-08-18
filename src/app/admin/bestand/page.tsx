import { requireAdmin, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { buildAdminBoardGameRows } from "@/lib/ludothek/admin-bestand-rows";
import { AdminBestandView } from "@/components/feature/admin-bestand/admin-bestand-view";

export default async function AdminBestandPage({
  searchParams,
}: {
  searchParams: Promise<{ deinventarisiert?: string; ean?: string }>;
}) {
  await requireAdmin();
  const { deinventarisiert, ean } = await searchParams;
  const showDeinventarised = deinventarisiert === "1";

  const user = await getCurrentUser();
  const canManageGames = user
    ? await hasPermissionInCurrentView(user.id, "games:manage")
    : false;

  const rows = await buildAdminBoardGameRows({ showDeinventarised });

  return (
    <AdminBestandView
      games={rows}
      showDeinventarised={showDeinventarised}
      defaultEan={ean}
      canManageGames={canManageGames}
    />
  );
}
