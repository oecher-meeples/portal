import { requirePermission } from "@/lib/auth/permissions";
import { listImportantLinks } from "@/lib/links/links";
import { AdminLinksView } from "@/components/feature/admin-links/admin-links-view";

export default async function AdminLinksPage() {
  await requirePermission("links:manage");

  const links = await listImportantLinks();

  return <AdminLinksView links={links} />;
}
