import { requireAdminPermission } from "@/lib/auth/session";
import { getUnconfirmedHoldingsQueue } from "@/lib/ludothek/unconfirmed-holdings-queue";
import { UnconfirmedHoldingsQueueView } from "@/components/feature/admin-bestand/unconfirmed-holdings-queue-view";

export default async function UnbestaetigtPage() {
  await requireAdminPermission("games:manage");

  const rows = await getUnconfirmedHoldingsQueue();

  return <UnconfirmedHoldingsQueueView rows={rows} />;
}
