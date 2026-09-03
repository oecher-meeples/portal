import Link from "next/link";
import { Dice5, ScanLine, Users, Tag } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDateShort } from "@/lib/utils/format";
import type { requireMember } from "@/lib/auth/session";
import type { getInternalContent } from "@/lib/content/content";
import type { listImportantLinks } from "@/lib/links/links";
import { ActionButton } from "@/components/ui/action-button";
import { scanConfirmHolding } from "@/lib/ludothek/holding-actions";
import { ImportantLinksGrid } from "@/components/widgets/important-links-grid";
import { ImportantLinksEditor } from "@/components/feature/dashboard/important-links-editor";
import { PageContainer } from "@/components/ui/page-container";

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
  totalOpenLfgCount: number;
  activeMarketListingCount: number;
  importantLinks: Awaited<ReturnType<typeof listImportantLinks>>;
  /** Admin mit `links:manage` in der aktuellen Ansicht — Abschnitt bleibt
   * dann immer sichtbar und wird inline editierbar (Pivot #110). */
  canManageLinks: boolean;
  resignationNotice: { endsAt: string; openHoldingsCount: number } | null;
  /** Frühestes anstehendes Event mit `helpersWanted` (#155) — null blendet die Karte aus. */
  openHelperRequestEvent: { id: string; title: string } | null;
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
  totalOpenLfgCount,
  activeMarketListingCount,
  importantLinks,
  canManageLinks,
  resignationNotice,
  openHelperRequestEvent,
}: DashboardViewProps) {
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Angemeldet als Mitglied"
        title={`Hallo, ${user.name}`}
        description="Dein persönlicher Einstieg in den internen Bereich."
      />

      {openHelperRequestEvent && (
        <Link
          href="/helfer"
          className="bg-primary/10 hover:bg-primary/15 rounded-md p-4 text-sm transition-colors"
        >
          Für <strong>{openHelperRequestEvent.title}</strong> werden noch Helfer
          gesucht — jetzt eintragen.
        </Link>
      )}

      {resignationNotice && (
        <div className="bg-primary/10 rounded-md p-4 text-sm">
          Deine Kündigung ist vermerkt, wirksam zum {resignationNotice.endsAt}.
          {resignationNotice.openHoldingsCount > 0 && (
            <>
              {" "}
              Bei dir liegen noch {resignationNotice.openHoldingsCount}{" "}
              Vereinsspiele/-einheiten — bitte rechtzeitig zurückgeben:{" "}
              <Link
                href={`/ludothek?bei=${meepleId}&ausgeliehen=1`}
                className="text-primary font-medium hover:underline"
              >
                zur Ludothek-Rückgabe
              </Link>
              , oder wende dich an den Spielewart.
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatTile
          href={`/ludothek?bei=${meepleId}&ausgeliehen=1`}
          label="Eigene Ausleihen"
          value={ownLoansCount}
          hint="Spiele"
        />
        <StatTile
          href={`/ludothek?bei=${meepleId}`}
          label="In meinen Kartons"
          value={ownUnitContentsCount}
          hint="Spiele"
        />
        <StatTile
          href="/lfg"
          label="Offene Gesuche"
          value={ownOpenLfgCount}
          hint="von dir"
        />
        <StatTile
          href="/helfer"
          label="Anstehende Schichten"
          value={upcomingShiftCount}
          hint="eigene Zusagen"
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatTile
          href="/lfg"
          label="Offene Gesuche"
          value={totalOpenLfgCount}
          hint="im Verein"
        />
        <StatTile
          href="/markt"
          label="Marktplatz-Angebote"
          value={activeMarketListingCount}
          hint="aktiv"
        />
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
          {/* #209: /dashboard/kalender entfernt (News-Konsolidierung) — /news
           * deckt Öffentlich+Intern bereits über die "Nur interne
           * anzeigen"-Checkbox ab. */}
          <Link
            href="/news"
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
        <ImportantLinksGrid items={QUICK_LINKS} />
      </div>

      {(importantLinks.length > 0 || canManageLinks) && (
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-bold">Wichtige Links</h2>
          {canManageLinks ? (
            <ImportantLinksEditor links={importantLinks} />
          ) : (
            <ImportantLinksGrid
              items={importantLinks.map((link) => ({
                href: link.targetUrl,
                label: link.title,
                iconUrl: link.iconUrl ?? undefined,
                external: true,
              }))}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
}
