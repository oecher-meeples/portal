import Link from "next/link";
import { Tag, Mail, ClipboardCheck, Landmark } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { BlobStorageUsageCard } from "@/components/entities/blob-storage-usage-card";
import type { BlobStorageUsage } from "@/lib/admin/blob-storage";

const QUICK_ACTIONS = [
  {
    href: "/admin/einheiten/etiketten",
    label: "QR-Etiketten drucken",
    icon: Tag,
  },
  { href: "/admin/mitglieder", label: "Mitglied einladen", icon: Mail },
  { href: "/admin/bestand", label: "Prüfung anfordern", icon: ClipboardCheck },
  { href: "/admin/bank", label: "Beitragseinzug", icon: Landmark },
];

export type AdminDashboardStats = {
  activeMembers: number;
  openLoans: number;
  openInvites: number;
  gamesInStock: number;
  unregisteredGames: number;
  openChecks: number;
  activeEvents: number;
};

export function AdminDashboardView({
  stats,
  blobStorageUsage,
}: {
  stats: AdminDashboardStats;
  blobStorageUsage: BlobStorageUsage | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Admin-Bereich"
        title="Verwaltung"
        description="Überblick über Bestand, Ausleihen und laufende Vorgänge."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Aktive Mitglieder"
          value={stats.activeMembers}
          href="/admin/mitglieder#mitglieder"
        />
        <StatTile
          label="Offene Ausleihen"
          value={stats.openLoans}
          href="/ludothek?ausgeliehen=1"
        />
        <StatTile
          label="Offene Einladungen"
          value={stats.openInvites}
          href="/admin/mitglieder#einladungen"
        />
        <StatTile
          label="Spiele im Bestand"
          value={stats.gamesInStock}
          href="/admin/bestand"
        />
        <StatTile
          label="Nicht erfasst"
          value={stats.unregisteredGames}
          href="/admin/bestand?filter=nicht-erfasst"
        />
        <StatTile
          label="Prüfungen offen"
          value={stats.openChecks}
          href="/admin/bestand?filter=ungeprueft"
        />
        <StatTile
          label="Aktive Events"
          value={stats.activeEvents}
          href="/admin/events"
        />
        {blobStorageUsage && <BlobStorageUsageCard usage={blobStorageUsage} />}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-bold">Schnellaktionen</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-card hover:border-primary/60 flex flex-col items-center gap-2 rounded-lg border p-6 text-center transition-colors"
            >
              <action.icon className="text-primary size-6" />
              <span className="font-serif text-sm font-semibold">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
