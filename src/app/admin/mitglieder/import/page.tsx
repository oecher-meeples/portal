import { requireAdminPermission } from "@/lib/auth/session";
import { MemberImportView } from "@/components/feature/admin-mitglieder-import/member-import-view";

/** Mitgliederliste-Import (#611) — nur mit `members:manage`, wie die
 * Anlage einzelner Mitglieder. */
export default async function AdminMitgliederImportPage() {
  await requireAdminPermission("members:manage");

  return <MemberImportView />;
}
