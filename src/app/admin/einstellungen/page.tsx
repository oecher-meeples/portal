import { requireAdmin } from "@/lib/auth/session";
import { PageHeading } from "@/components/ui/page-heading";
import { prisma } from "@/lib/utils/prisma";
import { SettingsCard } from "@/components/feature/admin-settings/settings-card";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const connection = await prisma.instagramConnection.findFirst();

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
