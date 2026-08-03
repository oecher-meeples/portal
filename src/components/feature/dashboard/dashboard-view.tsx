import Link from "next/link";
import { Dice5, ScanLine, Users, Tag } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDateShort } from "@/lib/utils/format";
import type { requireMember } from "@/lib/auth/session";
import type { getInternalContent } from "@/lib/content/content";
import { ActionButton } from "@/components/ui/action-button";
import { scanConfirmHolding } from "@/lib/ludothek/holding-actions";

const QUICK_LINKS = [
  { href: "/ludothek", label: "Ludothek", icon: Dice5 },
  { href: "/scan", label: "Spiel scannen", icon: ScanLine },
  { href: "/lfg", label: "Spielergesuche", icon: Users },
  { href: "/markt", label: "Marktplatz", icon: Tag },
];

export type PendingHolding = {
  id: string;
  gameTitle: string;
};

type DashboardViewProps = {
  user: Awaited<ReturnType<typeof requireMember>>["user"];
  meepleId: string;
  internalNews: Awaited<ReturnType<typeof getInternalContent>>;
  ownLoansCount: number;
  ownUnitContentsCount: number;
  unconfirmedHandovers: PendingHolding[];
  unconfirmedReturns: PendingHolding[];
  ownOpenLfgCount: number;
  upcomingShiftCount: number;
  resignationNotice: { endsAt: string; openHoldingsCount: number } | null;
};

export function DashboardView({
  user,
  meepleId,
  internalNews,
  ownLoansCount,
  ownUnitContentsCount,
  unconfirmedHandovers,
  unconfirmedReturns,
  ownOpenLfgCount,
  upcomingShiftCount,
  resignationNotice,
}: DashboardViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Angemeldet als Mitglied"
        title={`Hallo, ${user.name}`}
        description="Dein persönlicher Einstieg in den internen Bereich."
      />

      {resignationNotice && (
        <div className="bg-primary/10 rounded-md p-4 text-sm">
          Deine Kündigung ist vermerkt, wirksam zum {resignationNotice.endsAt}.
          {resignationNotice.openHoldingsCount > 0 && (
            <>
              {" "}
              Bei dir liegen noch {resignationNotice.openHoldingsCount}{" "}
              Vereinsspiele/-einheiten — bitte rechtzeitig zurückgeben.
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={`/ludothek?bei=${meepleId}&ausgeliehen=1`}>
          <StatTile
            label="Eigene Ausleihen"
            value={ownLoansCount}
            hint="Spiele"
          />
        </Link>
        <Link href={`/ludothek?bei=${meepleId}`}>
          <StatTile
            label="In meinen Kartons"
            value={ownUnitContentsCount}
            hint="Spiele"
          />
        </Link>
        <Link href="/lfg">
          <StatTile
            label="Offene Gesuche"
            value={ownOpenLfgCount}
            hint="von dir"
          />
        </Link>
        <Link href="/helfer">
          <StatTile
            label="Anstehende Schichten"
            value={upcomingShiftCount}
            hint="eigene Zusagen"
          />
        </Link>
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
            {internalNews.length === 0 && (
              <li className="text-muted-foreground py-3 text-sm">
                Keine internen Beiträge.
              </li>
            )}
          </ul>
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Interner Kalender</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Öffentliche und interne Termine an einem Ort.
          </p>
          <Link
            href="/dashboard/kalender"
            className="text-primary mt-3 inline-block text-sm hover:underline"
          >
            Zum Vereinskalender →
          </Link>
        </div>
      </div>

      {(unconfirmedHandovers.length > 0 || unconfirmedReturns.length > 0) && (
        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Offene Vorgänge</h2>
          <ul className="mt-3 flex flex-col divide-y">
            {unconfirmedHandovers.map((holding) => (
              <li
                key={holding.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span>{holding.gameTitle} — Weitergabe bestätigen</span>
                <ActionButton
                  size="sm"
                  action={scanConfirmHolding.bind(null, holding.id)}
                >
                  Bestätigen
                </ActionButton>
              </li>
            ))}
            {unconfirmedReturns.map((holding) => (
              <li
                key={holding.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span>{holding.gameTitle} — Rückgabe: jetzt einlagern</span>
                <Link
                  href="/scan"
                  className="text-primary text-sm hover:underline"
                >
                  Zum Scan →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
