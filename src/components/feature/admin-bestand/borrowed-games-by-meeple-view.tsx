import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatDatePlain } from "@/lib/utils/format";
import type { MeepleWithActiveHoldings } from "@/lib/ludothek/holdings-by-meeple";

/** Ausleihe-Übersicht nach Mitglied (#272) — eine Accordion-Zeile je Meeple
 * mit Badge (Anzahl gehaltener Exemplare), Trigger-Pattern 1:1 nach Vorbild
 * `mitglieder-table.tsx`. */
export function BorrowedGamesByMeepleView({
  meeples,
}: {
  meeples: MeepleWithActiveHoldings[];
}) {
  if (meeples.length === 0) {
    return (
      <div className="bg-card text-muted-foreground rounded-lg border p-5 text-sm">
        Aktuell hat niemand ein Spiel bei sich.
      </div>
    );
  }

  return (
    <Accordion className="bg-card rounded-lg border">
      {meeples.map((meeple) => (
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
                  <span className="text-muted-foreground text-xs">
                    seit {formatDatePlain(holding.startedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
