import { requireAdminPermission } from "@/lib/auth/session";
import { EINSTELLUNGEN_PERMISSIONS } from "@/lib/utils/nav-config";
import { PageHeading } from "@/components/ui/page-heading";
import { prisma } from "@/lib/utils/prisma";
import { SettingsCard } from "@/components/feature/admin-settings/settings-card";
import { InviteSettingsDialog } from "@/components/feature/admin-settings/invite-settings-dialog";
import { TshirtSizeDialog } from "@/components/feature/admin-settings/tshirt-size-dialog";
import { getDefaultInviteDays } from "@/lib/members/invite-settings";

export default async function AdminSettingsPage() {
  await requireAdminPermission(EINSTELLUNGEN_PERMISSIONS);

  const [connection, storageUnitCount, defaultInviteDays, tshirtSizeCount] =
    await Promise.all([
      prisma.instagramConnection.findFirst(),
      prisma.storageUnit.count(),
      getDefaultInviteDays(),
      prisma.tshirtSize.count(),
    ]);

  const modules = [
    {
      title: "Instagram",
      description: "Cross-Posting von Beiträgen nach Instagram verwalten.",
      href: "/admin/einstellungen/instagram",
      status: connection
        ? { label: "Verbunden", variant: "default" as const }
        : { label: "Nicht verbunden", variant: "outline" as const },
    },
    {
      title: "Aufbewahrungseinheiten",
      description: "Lagerorte für den Spielebestand verwalten.",
      href: "/admin/einheiten",
      count: storageUnitCount,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Administration" title="Einstellungen" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <SettingsCard key={module.href} {...module} />
        ))}
        <InviteSettingsDialog defaultDays={defaultInviteDays} />
        <TshirtSizeDialog count={tshirtSizeCount} />
      </div>
    </div>
  );
}
