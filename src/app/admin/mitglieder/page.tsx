import { requireAdmin } from "@/lib/session";
import { MEMBERS, MEMBER_STATS } from "@/data/members";
import { AdminMitgliederMockView } from "@/components/feature/admin-mitglieder/admin-mitglieder-mock-view";

export default async function AdminMitgliederPage() {
  await requireAdmin();

  return <AdminMitgliederMockView stats={MEMBER_STATS} members={MEMBERS} />;
}
