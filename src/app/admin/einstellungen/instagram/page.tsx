import { requireAdminPermission } from "@/lib/auth/session";
import { PageHeading } from "@/components/ui/page-heading";
import { prisma } from "@/lib/utils/prisma";
import { InstagramConnectionView } from "@/components/feature/admin-settings/instagram-connection-view";

export default async function AdminInstagramSettingsPage() {
  await requireAdminPermission("instagram:connect");

  const connection = await prisma.instagramConnection.findFirst();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Einstellungen" title="Instagram" />
      <InstagramConnectionView
        connected={!!connection}
        expiresAt={connection?.expiresAt.toISOString() ?? null}
      />
    </div>
  );
}
