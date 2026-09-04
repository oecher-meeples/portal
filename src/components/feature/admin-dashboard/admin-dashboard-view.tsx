import {
  Tag,
  Mail,
  ClipboardCheck,
  Landmark,
  AlertTriangle,
} from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { BlobStorageUsageCard } from "@/components/entities/blob-storage-usage-card";
import { NeonStorageUsageCard } from "@/components/entities/neon-storage-usage-card";
import type { BlobStorageUsage } from "@/lib/admin/blob-storage";
import type { NeonStorageUsage } from "@/lib/admin/neon-storage";
import type { RateLimitAlert } from "@/lib/auth/rate-limit-alerts";
import { formatDateTime } from "@/lib/utils/format";
import { PageContainer } from "@/components/ui/page-container";

export type AdminLoginLogEntry = {
  id: string;
  neonAuthUserId: string;
  ipAddress: string | null;
  userAgent: string | null;
  at: Date;
};

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

/** Offene Anträge (#440, Live-Review) — je Kategorie `null`, wenn der
 * Betrachter die zugehörige Berechtigung nicht hat, sonst die Anzahl (auch
 * 0, dann trotzdem angezeigt statt die Kachel wegzulassen). */
export type OpenRequestCounts = {
  ibanChanges: number | null;
  stammdatenChanges: number | null;
  unconfirmedHoldings: number | null;
};

export function AdminDashboardView({
  stats,
  openRequestCounts,
  blobStorageUsage,
  neonStorageUsage,
  rateLimitAlerts,
  recentAdminLogins,
}: {
  stats: AdminDashboardStats;
  openRequestCounts: OpenRequestCounts;
  blobStorageUsage: BlobStorageUsage | null;
  neonStorageUsage: NeonStorageUsage | null;
  rateLimitAlerts: RateLimitAlert[];
  /** `null`, wenn der Betrachter kein `admin:access` hat (#231) — die
   * Login-Historie ist sensibel und nicht Teil des sonstigen
   * Admin-Dashboards. */
  recentAdminLogins: AdminLoginLogEntry[] | null;
}) {
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Admin-Bereich"
        title="Verwaltung"
        description="Überblick über Bestand, Ausleihen und laufende Vorgänge."
      />

      {rateLimitAlerts.length > 0 && (
        <div className="border-destructive/50 bg-card flex flex-col gap-2 rounded-lg border p-5">
          <h2 className="text-destructive flex items-center gap-2 font-serif text-lg font-bold">
            <AlertTriangle className="size-5" aria-hidden />
            Rate-Limit-Warnungen
          </h2>
          <ul className="text-muted-foreground list-inside list-disc text-sm">
            {rateLimitAlerts.map((alert) => (
              <li key={alert.label}>{alert.label}</li>
            ))}
          </ul>
        </div>
      )}

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
        {openRequestCounts.ibanChanges !== null && (
          <StatTile
            label="Offene IBAN-Änderungen"
            value={openRequestCounts.ibanChanges}
            href="/admin/bank"
          />
        )}
        {openRequestCounts.stammdatenChanges !== null && (
          <StatTile
            label="Offene Stammdaten-Änderungen"
            value={openRequestCounts.stammdatenChanges}
            href="/admin/mitglieder"
          />
        )}
        {openRequestCounts.unconfirmedHoldings !== null && (
          <StatTile
            label="Offene Spiele-Übergaben"
            value={openRequestCounts.unconfirmedHoldings}
            href="/admin/bestand/unbestaetigt"
          />
        )}
        {blobStorageUsage && <BlobStorageUsageCard usage={blobStorageUsage} />}
        {neonStorageUsage && <NeonStorageUsageCard usage={neonStorageUsage} />}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-bold">Schnellaktionen</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.label}
              href={action.href}
              label={action.label}
              icon={action.icon}
            />
          ))}
        </div>
      </div>

      {recentAdminLogins && recentAdminLogins.length > 0 && (
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">
            Login-Historie (admin:access)
          </h2>
          <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
            {recentAdminLogins.map((entry) => (
              <li key={entry.id}>
                {formatDateTime(entry.at)} —{" "}
                {entry.ipAddress ?? "unbekannte IP"}
                {entry.userAgent ? ` — ${entry.userAgent}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageContainer>
  );
}
