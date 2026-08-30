import { requireAdminPermission } from "@/lib/auth/session";
import { EINSTELLUNGEN_PERMISSIONS } from "@/lib/utils/nav-config";
import { PageHeading } from "@/components/ui/page-heading";
import { prisma } from "@/lib/utils/prisma";
import { SettingsCard } from "@/components/feature/admin-settings/settings-card";

export default async function AdminSettingsPage() {
  await requireAdminPermission(EINSTELLUNGEN_PERMISSIONS);

  const [connection, storageUnitCount] = await Promise.all([
    prisma.instagramConnection.findFirst(),
    prisma.storageUnit.count(),
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
    {
      title: "Einladungen",
      description: "Gültigkeitsdauer für neue Einladungen festlegen.",
      href: "/admin/einstellungen/einladungen",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Administration" title="Einstellungen" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <SettingsCard key={module.href} {...module} />
        ))}
      </div>
    </div>
  );
}
