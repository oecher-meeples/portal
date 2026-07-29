import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminBestandView } from "@/components/feature/admin-bestand/admin-bestand-view";

export default async function AdminBestandPage() {
  await requireAdmin();

  const games = await prisma.boardGame.findMany({
    orderBy: { title: "asc" },
  });

  return <AdminBestandView games={games} />;
}
