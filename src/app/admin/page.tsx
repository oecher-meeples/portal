import Link from "next/link";
import { Tag, Mail, ClipboardCheck, Wallet } from "lucide-react";
import { RoleGate } from "@/components/shared/role-gate";
import { PageHeading } from "@/components/shared/page-heading";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusPill } from "@/components/shared/status-pill";

const OVERDUE_LOANS = [
  { game: "Root", borrower: "Tobias", overdue: "+4 Tage" },
  { game: "Terraforming Mars", borrower: "Nadia", overdue: "+2 Tage" },
  { game: "Gaia Project", borrower: "Lea", overdue: "+1 Tag" },
];

const QUICK_ACTIONS = [
  { href: "/admin/bestand", label: "QR-Etiketten drucken", icon: Tag },
  { href: "/admin/mitglieder", label: "Mitglied einladen", icon: Mail },
  { href: "/admin/bestand", label: "Inventur starten", icon: ClipboardCheck },
  { href: "/admin/bringbuy", label: "Bring & Buy", icon: Wallet },
];

export default function AdminDashboardPage() {
  return (
    <RoleGate minRole="admin">
      <div className="flex flex-col gap-6">
        <PageHeading
          eyebrow="Admin-Bereich"
          title="Verwaltung"
          description="Überblick über Bestand, Ausleihen und laufende Vorgänge."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Spiele im Bestand"
            value={612}
            hint="+12 diesen Monat"
          />
          <StatTile label="Aktuell verliehen" value={48} hint="7 überfällig" />
          <StatTile
            label="Aktive Mitglieder"
            value={96}
            hint="4 Einladungen offen"
          />
          <StatTile label="In Wartung" value={5} hint="1 Totalschaden" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-lg border p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold">
                Überfällige Ausleihen
              </h2>
              <Link
                href="/admin/bestand"
                className="text-primary text-sm hover:underline"
              >
                Alle
              </Link>
            </div>
            <ul className="flex flex-col divide-y">
              {OVERDUE_LOANS.map((loan) => (
                <li
                  key={loan.game}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="font-medium">{loan.game}</p>
                    <p className="text-muted-foreground text-sm">
                      {loan.borrower}
                    </p>
                  </div>
                  <StatusPill label={loan.overdue} tone="negative" />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-bold">Schnellaktionen</h2>
            <div className="grid grid-cols-2 gap-3">
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
      </div>
    </RoleGate>
  );
}
