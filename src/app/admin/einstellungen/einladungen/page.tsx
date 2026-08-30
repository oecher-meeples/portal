import { requirePermission } from "@/lib/auth/permissions";
import { PageHeading } from "@/components/ui/page-heading";
import { getDefaultInviteDays } from "@/lib/members/invite-settings";
import { InviteSettingsForm } from "@/components/feature/admin-settings/invite-settings-form";

export default async function AdminInviteSettingsPage() {
  await requirePermission("invites:manage");

  const defaultDays = await getDefaultInviteDays();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Einstellungen"
        title="Einladungen"
        description="Gilt für alle neu erzeugten Einladungen — bestehende Einladungen behalten ihre ursprüngliche Gültigkeitsdauer."
      />
      <InviteSettingsForm defaultDays={defaultDays} />
    </div>
  );
}
