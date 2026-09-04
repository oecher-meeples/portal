"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown, Search } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { GameActionsMenu } from "@/components/widgets/game-holding/game-actions-menu";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { formatDatePlain } from "@/lib/utils/format";
import { PageContainer } from "@/components/ui/page-container";
import type {
  ActiveMeepleHolding,
  MeepleWithActiveHoldings,
} from "@/lib/ludothek/holdings-by-meeple";

/** Ein person-gehaltenes Exemplar ist per Definition "ausgeliehen" — kein
 * Standort-Baum wie bei `admin-bestand-rows.ts` zu walken. */
function actionsMenuCopy(holding: ActiveMeepleHolding, verfuegbar: boolean) {
  return {
    id: holding.gameCopyId,
    zustand: verfuegbar
      ? ("ausgeliehen-verfuegbar" as const)
      : ("ausgeliehen-nicht-verfuegbar" as const),
    locationChain: holding.locationChain,
    condition: holding.condition,
    ruleBookLanguages: holding.ruleBookLanguages,
    inventoryNumber: holding.inventoryNumber,
  };
}

/** Private Kontaktdaten eines Vereinsmitglieds — nur für `games:manage`
 * sichtbar, in beiden "ausgeliehen"-Unterfällen (#333). */
function memberAddress(meeple: MeepleWithActiveHoldings) {
  const line = [meeple.postalCode, meeple.city].filter(Boolean).join(" ");
  const parts = [meeple.street, line].filter(Boolean);
  return { address: parts.join(", "), phone: meeple.phone };
}

/** Ausleihe-Übersicht nach Mitglied (#272) — eine Accordion-Zeile je Meeple
 * mit Badge (Anzahl gehaltener Exemplare), Trigger-Pattern 1:1 nach Vorbild
 * `mitglieder-table.tsx`. Suchfeld filtert nach Spieltitel, blendet Meeples
 * ohne Treffer aus. Jedes Spiel bekommt das übliche `GameActionsMenu`. */
export function BorrowedGamesByMeepleView({
  meeples,
  canManageGames,
}: {
  meeples: MeepleWithActiveHoldings[];
  canManageGames: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return meeples;
    return meeples
      .map((meeple) => ({
        ...meeple,
        holdings: meeple.holdings.filter((holding) =>
          holding.boardGameTitle.toLowerCase().includes(term),
        ),
      }))
      .filter((meeple) => meeple.holdings.length > 0);
  }, [meeples, search]);

  return (
    <PageContainer className="gap-3">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Spiel suchen …"
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-lg border p-5 text-sm">
          {meeples.length === 0
            ? "Aktuell hat niemand ein Spiel bei sich."
            : "Kein Treffer für diese Suche."}
        </div>
      ) : (
        <Accordion
          // Remount bei jeder Sucheingabe (statt controlled): Treffer sollen
          // sofort aufgeklappt sein, manuelles Zu-/Aufklappen bleibt möglich.
          key={search}
          className="bg-card rounded-lg border"
          defaultValue={
            search.trim()
              ? filtered.map((meeple) => meeple.vereinsmitgliedId)
              : []
          }
          multiple
        >
          {filtered.map((meeple) => {
            const { address, phone } = memberAddress(meeple);
            return (
              <AccordionItem
                key={meeple.vereinsmitgliedId}
                value={meeple.vereinsmitgliedId}
              >
                {/* Eigener Header statt des gemeinsamen `AccordionTrigger`
                 * (der den kompletten Inhalt in einen `<button>` packt):
                 * `ContactDialog` braucht selbst einen `<button>`-Trigger,
                 * ein Button im Button ist ungültiges HTML und führt zu
                 * Klick-Konflikten. Name/Kontakt sitzt hier als Geschwister
                 * neben dem eigentlichen Auf-/Zuklapp-Trigger, nicht darin. */}
                <AccordionPrimitive.Header className="flex w-full items-center gap-2 px-5 py-3 text-sm">
                  {/* #412-Folgefeedback ursprünglich als reiner Hover-Preview
                   * gelöst — jetzt überflüssig: `ContactDialog` zeigt beim
                   * Öffnen selbst das große Bild (mit `hideWithoutPicture`,
                   * kein leerer Initialen-Kreis ohne Bild). */}
                  {meeple.meepleId ? (
                    <ContactDialog
                      name={meeple.memberName}
                      meepleId={meeple.meepleId}
                      className="font-medium"
                    />
                  ) : (
                    <span className="font-medium">{meeple.memberName}</span>
                  )}
                  <AccordionPrimitive.Trigger className="group flex flex-1 items-center justify-between gap-2 py-1 text-left font-medium transition-colors hover:underline">
                    <span className="flex items-center gap-2">
                      {!meeple.verfuegbar && (
                        <Badge variant="outline">nicht verfügbar</Badge>
                      )}
                      <Badge>{meeple.holdings.length}</Badge>
                    </span>
                    <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 group-data-panel-open:rotate-180" />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPanel className="px-5">
                  {canManageGames && (address || phone) && (
                    <p className="text-muted-foreground mb-2 text-xs">
                      {address}
                      {address && phone ? " · " : ""}
                      {phone}
                    </p>
                  )}
                  <ul className="flex flex-col divide-y">
                    {meeple.holdings.map((holding) => (
                      <li
                        key={holding.gameCopyId}
                        className="flex items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="flex items-center gap-1.5">
                          <Link
                            href={`/ludothek/${holding.boardGameSlug}`}
                            className="hover:underline"
                          >
                            {holding.boardGameTitle}
                          </Link>
                          {holding.isUnconfirmed && (
                            <StatusPill label="unbestätigt" tone="warning" />
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            seit {formatDatePlain(holding.startedAt)}
                          </span>
                          <GameActionsMenu
                            copies={[
                              actionsMenuCopy(holding, meeple.verfuegbar),
                            ]}
                            boardGameId={holding.boardGameId}
                            boardGameTitle={holding.boardGameTitle}
                            canManageGames={canManageGames}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </PageContainer>
  );
}
