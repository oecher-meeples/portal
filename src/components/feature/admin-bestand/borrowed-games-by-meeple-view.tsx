"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GameActionsMenu } from "@/components/widgets/game-holding/game-actions-menu";
import { formatDatePlain } from "@/lib/utils/format";
import type {
  ActiveMeepleHolding,
  MeepleWithActiveHoldings,
} from "@/lib/ludothek/holdings-by-meeple";

/** Ein person-gehaltenes Exemplar ist per Definition "ausgeliehen" — kein
 * Standort-Baum wie bei `admin-bestand-rows.ts` zu walken. */
function actionsMenuCopy(holding: ActiveMeepleHolding) {
  return {
    id: holding.gameCopyId,
    zustand: "ausgeliehen" as const,
    locationChain: holding.locationChain,
    condition: holding.condition,
    ruleBookLanguages: holding.ruleBookLanguages,
    inventoryNumber: holding.inventoryNumber,
  };
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
    <div className="flex flex-col gap-3">
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
            search.trim() ? filtered.map((meeple) => meeple.meepleId) : []
          }
          multiple
        >
          {filtered.map((meeple) => (
            <AccordionItem key={meeple.meepleId} value={meeple.meepleId}>
              <AccordionTrigger className="px-5">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{meeple.meepleName}</span>
                  <Badge>{meeple.holdings.length}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionPanel className="px-5">
                <ul className="flex flex-col divide-y">
                  {meeple.holdings.map((holding) => (
                    <li
                      key={holding.gameCopyId}
                      className="flex items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span>{holding.boardGameTitle}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          seit {formatDatePlain(holding.startedAt)}
                        </span>
                        <GameActionsMenu
                          copies={[actionsMenuCopy(holding)]}
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
          ))}
        </Accordion>
      )}
    </div>
  );
}
