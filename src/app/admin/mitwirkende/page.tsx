import { requireAdminPermission } from "@/lib/auth/session";
import { listContributorsForAdmin } from "@/lib/ludothek/taxonomy/contributor-admin-queries";
import { AdminContributorsView } from "@/components/feature/admin-contributors/admin-contributors-view";

export default async function AdminMitwirkendePage() {
  await requireAdminPermission("games:manage");
  const rows = await listContributorsForAdmin();

  return <AdminContributorsView rows={rows} />;
}
