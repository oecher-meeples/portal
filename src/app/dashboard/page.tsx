import Link from "next/link";
import { Dice5, ScanLine, Users, Tag } from "lucide-react";
import { requireMember } from "@/lib/session";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { getAllContent } from "@/lib/content";
import { formatDateShort } from "@/lib/format";

const QUICK_LINKS = [
  { href: "/ludothek", label: "Ludothek", icon: Dice5 },
  { href: "/scan", label: "Spiel scannen", icon: ScanLine },
  { href: "/lfg", label: "Spielergesuche", icon: Users },
  { href: "/markt", label: "Marktplatz", icon: Tag },
];

export default async function DashboardPage() {
  const user = await requireMember();
  const internalNews = (await getAllContent()).filter((item) => item.internal);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Angemeldet als Mitglied"
        title={`Hallo, ${user.name} ðŸ‘‹`}
        description="Dein persÃ¶nlicher Einstieg in den internen Bereich."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Aktuell geliehen" value={2} hint="Spiele" />
        <StatTile label="Offene Gesuche" value={1} hint="dein Inserat" />
        <StatTile label="Helfer-Schichten" value={3} hint="zugesagt" />
        <StatTile label="Meine Angebote" value={1} hint="im Markt" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Interner Newsroom</h2>
          <ul className="mt-3 flex flex-col divide-y">
            {internalNews.map((item) => (
              <li
                key={item.slug}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {item.excerpt}
                  </p>
                </div>
                <span className="bg-muted shrink-0 rounded px-2 py-1 font-mono text-xs">
                  {formatDateShort(item.date)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Interner Kalender</h2>
          <PlaceholderMedia label="VEREINSINTERNE TERMINE" className="mt-3" />
          <p className="bg-primary/10 mt-3 rounded-md p-3 text-sm">
            Separater interner Kalender â€“ nur fÃ¼r Mitglieder sichtbar.
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
              className="bg-card hover:border-primary/60 flex flex-col items-center gap-2 rounded-lg border p-6 text-center transition-colors"
            >
              <link.icon className="text-primary size-6" />
              <span className="font-serif font-semibold">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
