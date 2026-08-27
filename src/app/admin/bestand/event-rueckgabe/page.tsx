import { requireAdminPermission } from "@/lib/auth/session";
import { EventReturnView } from "@/components/feature/admin-bestand/event-return-view";

export default async function EventRueckgabePage() {
  await requireAdminPermission("games:manage");

  return <EventReturnView />;
}
