import { requireAdmin } from "@/lib/session";
import { GAMES } from "@/data/games";
import { AdminBestandMockView } from "@/components/feature/admin-bestand/admin-bestand-mock-view";

export default async function AdminBestandPage() {
  await requireAdmin();

  return <AdminBestandMockView games={GAMES} />;
}
