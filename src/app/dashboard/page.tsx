import Link from "next/link";
import { Dice5, ScanLine, Users, Tag } from "lucide-react";
import { RoleGate } from "@/components/shared/role-gate";
import { PageHeading } from "@/components/shared/page-heading";
import { StatTile } from "@/components/shared/stat-tile";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { CONTENT_ITEMS } from "@/data/content";
import { formatDateShort } from "@/lib/format";

const QUICK_LINKS = [
  { href: "/ludothek", label: "Ludothek", icon: Dice5 },
  { href: "/scan", label: "Spiel scannen", icon: ScanLine },
  { href: "/lfg", label: "Spielergesuche", icon: Users },
  { href: "/markt", label: "Marktplatz", icon: Tag },
];

export default function DashboardPage() {
  const internalNews = CONTENT_ITEMS.filter((item) => item.internal);

  return (
    <RoleGate minRole="mitglied">
      <div className="flex flex-col gap-6">
        <PageHeading eyebrow="Angemeldet als Mitglied" title="Hallo, Jan 👋" description="Dein persönlicher Einstieg in den internen Bereich." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Aktuell geliehen" value={2} hint="Spiele" />
          <StatTile label="Offene Gesuche" value={1} hint="dein Inserat" />
          <StatTile label="Helfer-Schichten" value={3} hint="zugesagt" />
          <StatTile label="Meine Angebote" value={1} hint="im Markt" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-serif text-lg font-bold">Interner Newsroom</h2>
            <ul className="mt-3 flex flex-col divide-y">
              {internalNews.map((item) => (
                <li key={item.slug} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.excerpt}</p>
                  </div>
                  <span className="shrink-0 rounded bg-muted px-2 py-1 font-mono text-xs">
                    {formatDateShort(item.date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-serif text-lg font-bold">Interner Kalender</h2>
            <PlaceholderMedia label="VEREINSINTERNE TERMINE" className="mt-3" />
            <p className="mt-3 rounded-md bg-primary/10 p-3 text-sm">
              Separater interner Kalender – nur für Mitglieder sichtbar.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-bold">Schnellzugriff</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 text-center transition-colors hover:border-primary/60"
              >
                <link.icon className="size-6 text-primary" />
                <span className="font-serif font-semibold">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
