import { requireAdminPermission } from "@/lib/auth/session";
import { listTagsForAdmin } from "@/lib/ludothek/taxonomy/tag-admin-queries";
import { AdminTagsView } from "@/components/feature/admin-tags/admin-tags-view";

export default async function AdminTagsPage() {
  await requireAdminPermission("games:manage");
  const rows = await listTagsForAdmin();

  return <AdminTagsView rows={rows} />;
}
