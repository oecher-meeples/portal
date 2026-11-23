"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Dices, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { EditionFlag } from "@/components/entities/edition-flag";
import { describeVersion } from "@/lib/ludothek/taxonomy/version-label";
import type { OwnPrivateCollectionEntry } from "@/lib/ludothek/private-collection";
import type { OwnPrivateLoanOffer } from "@/lib/ludothek/private-event-loans";
import {
  offerPrivateGameForEventAction,
  withdrawPrivateGameOfferAction,
} from "@/components/widgets/private-collection/private-collection-actions";

type SortMode = "alphabetical" | "rating";
type StatusFilter = "forTrade" | "wantToPlay";
type OfferStatus = "OFFERED" | "LOANED" | null;

/**
 * Popup der Karte "Meine privaten Spiele" (#255-Folge): alle importierten
 * Titel mit Suche, Sortierung (alphabetisch/Bewertung), Status-Filtern und —
 * mit kommendem Event — der Ausleih-Freigabe je Titel (#122). Bleibt
 * gemountet, damit Suche und Filter beim erneuten Öffnen erhalten bleiben.
 */
export function PrivateCollectionDialog({
  open,
  onOpenChange,
  entries,
  nextEvent,
  ownOffers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: OwnPrivateCollectionEntry[];
  nextEvent: { id: string; title: string } | null;
  ownOffers: OwnPrivateLoanOffer[];
}) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("alphabetical");
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(
    new Set(),
  );
  // (#122-Folge, Live-Test): eigene Freigaben lokal statt über
  // router.refresh() nachführen — die Server Action revalidiert /profil
  // ohnehin per revalidatePath(), ein zusätzliches router.refresh() bei
  // offenem Dialog ließ Base UI dessen Schließen-Button (Klick) verlieren,
  // nur Esc funktionierte noch. Gleiches Muster wie
  // guardian-management-section.tsx: refresh={false} + optimistisches
  // onSuccess-Update.
  const [offerStatuses, setOfferStatuses] = useState<
    Record<string, OfferStatus>
  >(() => Object.fromEntries(ownOffers.map((o) => [o.boardGameId, o.status])));

  function toggleStatusFilter(filter: StatusFilter) {
    setStatusFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  }

  const visibleEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = entries
      .filter(
        (entry) => !term || entry.boardGame.title.toLowerCase().includes(term),
      )
      .filter(
        (entry) =>
          statusFilters.size === 0 ||
          (statusFilters.has("forTrade") && entry.forTrade) ||
          (statusFilters.has("wantToPlay") && entry.wantToPlay),
      );

    return [...filtered].sort((a, b) =>
      sortMode === "rating"
        ? (b.rating ?? -1) - (a.rating ?? -1)
        : a.boardGame.title.localeCompare(b.boardGame.title, "de"),
    );
  }, [entries, search, sortMode, statusFilters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ring-border shadow-2xl ring-2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meine privaten Spiele ({entries.length})</DialogTitle>
          <DialogDescription>
            Aus deiner BGG-Collection importierte Titel (nur besessene Spiele,
            keine Exemplar-Verwaltung).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Input
            placeholder="Spiel suchen …"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={sortMode === "alphabetical" ? "default" : "outline"}
                onClick={() => setSortMode("alphabetical")}
              >
                Alphabetisch
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortMode === "rating" ? "default" : "outline"}
                onClick={() => setSortMode("rating")}
              >
                Bewertung
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={statusFilters.has("forTrade") ? "default" : "outline"}
                className="cursor-pointer"
                render={
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter("forTrade")}
                  />
                }
              >
                <ArrowRightLeft />
                For Trade
              </Badge>
              <Badge
                variant={
                  statusFilters.has("wantToPlay") ? "default" : "outline"
                }
                className="cursor-pointer"
                render={
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter("wantToPlay")}
                  />
                }
              >
                <Dices />
                Want to Play
              </Badge>
            </div>
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {entries.length === 0
              ? "Noch keine Spiele importiert."
              : "Kein Treffer für diese Suche/Filter."}
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto text-sm">
            {visibleEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1.5 rounded-md border p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <Link
                      href={`/ludothek/${entry.boardGame.slug}`}
                      className="hover:text-primary flex min-w-0 items-center gap-1 truncate underline-offset-2 hover:underline"
                    >
                      <span className="truncate">{entry.boardGame.title}</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </Link>
                    {entry.version && (
                      <EditionFlag
                        languages={entry.version.languages}
                        className="shrink-0"
                      />
                    )}
                    {entry.rating !== null && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        ★ {entry.rating.toFixed(1)}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    {entry.forTrade && (
                      <StatusPill label="For Trade" tone="info" />
                    )}
                    {entry.wantToPlay && (
                      <StatusPill label="Want to Play" tone="neutral" />
                    )}
                  </span>
                </div>
                {entry.version && (
                  <p className="text-muted-foreground text-xs">
                    Version: {describeVersion(entry.version)}
                  </p>
                )}
                {nextEvent && (
                  <PrivateEventLoanToggle
                    eventId={nextEvent.id}
                    eventTitle={nextEvent.title}
                    boardGameId={entry.boardGame.id}
                    status={offerStatuses[entry.boardGame.id] ?? null}
                    onToggled={(nextStatus) =>
                      setOfferStatuses((current) => ({
                        ...current,
                        [entry.boardGame.id]: nextStatus,
                      }))
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** (#122) Ein-Klick-Freigabe eines einzelnen Titels für das nächste Event —
 * kein separater "Speichern"-Schritt, jeder Klick ist eine eigene
 * Server-Action-Ausführung wie überall sonst im Projekt (`ActionButton`).
 * `refresh={false}` + `onToggled` statt router.refresh() (siehe Kommentar
 * oben — offener Dialog + Refresh brach das X). */
function PrivateEventLoanToggle({
  eventId,
  eventTitle,
  boardGameId,
  status,
  onToggled,
}: {
  eventId: string;
  eventTitle: string;
  boardGameId: string;
  status: OfferStatus;
  onToggled: (nextStatus: "OFFERED" | null) => void;
}) {
  if (status === "LOANED") {
    return <StatusPill label={`Ausgeliehen (${eventTitle})`} tone="warning" />;
  }

  return (
    <ActionButton
      variant="outline"
      size="sm"
      className="w-fit"
      refresh={false}
      onSuccess={() => onToggled(status === "OFFERED" ? null : "OFFERED")}
      action={
        status === "OFFERED"
          ? withdrawPrivateGameOfferAction.bind(null, eventId, boardGameId)
          : offerPrivateGameForEventAction.bind(null, eventId, boardGameId)
      }
    >
      {status === "OFFERED"
        ? `Freigabe für "${eventTitle}" zurückziehen`
        : `Für "${eventTitle}" zur Ausleihe freigeben`}
    </ActionButton>
  );
}
