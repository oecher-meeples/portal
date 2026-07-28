import { PageHeading } from "@/components/ui/page-heading";
import { requirePermission } from "@/lib/permissions";
import { InviteForm } from "@/components/feature/admin-invites/invite-form";

export default async function AdminInvitesPage() {
  await requirePermission("invites:create");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding"
        title="Einladungen"
        description="Erzeuge einen zeitlich begrenzten Registrierungslink fÃ¼r neue Mitglieder."
      />
      <InviteForm />
    </div>
  );
}
