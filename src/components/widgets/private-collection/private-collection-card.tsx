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
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import { cn } from "@/lib/utils/cn";
import { syncPrivateBggCollection } from "@/lib/ludothek/private-collection-sync";
import { formatTimePlain } from "@/lib/utils/format";
import type { OwnPrivateCollectionEntry } from "@/lib/ludothek/private-collection";
import type { OwnPrivateLoanOffer } from "@/lib/ludothek/private-event-loans";
import {
  offerPrivateGameForEventAction,
  withdrawPrivateGameOfferAction,
} from "@/components/widgets/private-collection/private-collection-actions";

type SortMode = "alphabetical" | "rating";
type StatusFilter = "forTrade" | "wantToPlay";

/**
 * Übersichts-Karte "Meine privaten Spiele" im Profil (#255-Folge). Löst zwei
 * gemeldete Probleme des bisherigen Inline-Buttons im Formular: der Import
 * lief gegen den *gespeicherten* `bggUsername` (`getCurrentMeeple()`), der
 * Button stand aber im ungespeicherten Formular — Klick vor dem Speichern
 * schlug fehl. Und es gab kein Erfolgs-Feedback. Der Import-Button erscheint
 * jetzt hier, unabhängig vom Formular, nur wenn ein `bggUsername` bereits
 * persistiert ist; `ActionButton` liefert Lade- und Fehlerzustand von sich
 * aus, Erfolg zeigt die importierte Anzahl direkt auf der Karte. Klick auf
 * die Karte öffnet ein Popup mit Suche und Sortierung (alphabetisch/Bewertung).
 */
export function PrivateCollectionCard({
  bggUsername,
  entries,
  cooldownEndsAt,
  canForceImport,
  visibleToOthers,
  nextEvent = null,
  ownOffers = [],
}: {
  bggUsername: string | null;
  entries: OwnPrivateCollectionEntry[];
  cooldownEndsAt: Date | null;
  /** Dev-Environment oder sysadmin — darf den Cooldown per "!"-Button
   * übergehen (serverseitig in `syncPrivateBggCollection()` erneut geprüft). */
  canForceImport: boolean;
  /** `Meeple.privateCollectionVisible` — importierte Spiele erscheinen erst
   * in der Ludothek ("Auch Privatbesitz anzeigen"), wenn dieses Flag an ist
   * (#255-Folge: sonst „nicht auffindbar“, obwohl der Import geklappt hat). */
  visibleToOthers: boolean;
  /** (#122) Nächstes kommendes Event — einziger Freigabe-Kontext, `null`/
   * fehlend ohne kommendes Event (dann keine Freigabe-Steuerung). */
  nextEvent?: { id: string; title: string } | null;
  /** Eigene Freigaben für `nextEvent`, sofern vorhanden. */
  ownOffers?: OwnPrivateLoanOffer[];
}) {
  const [open, setOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
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
    Record<string, "OFFERED" | "LOANED" | null>
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

  async function runImport(ignoreCooldown: boolean) {
    const result = await syncPrivateBggCollection(ignoreCooldown);
    if ("success" in result) {
      setImportMessage(
        `${result.imported} ${result.imported === 1 ? "Spiel" : "Spiele"} importiert.`,
      );
    }
    return result;
  }

  const clickable = entries.length > 0;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border p-6",
        clickable && CARD_HOVER_CLASS,
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => setOpen(true) : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setOpen(true);
              }
            }
          : undefined
      }
    >
      <h2 className="font-serif text-lg font-bold">Meine privaten Spiele</h2>
      <div className="mt-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Aus BGG importiert
        </p>
        <p className="mt-2 font-serif text-3xl font-bold">{entries.length}</p>
      </div>

      {entries.length > 0 && !visibleToOthers && (
        <p
          className="text-muted-foreground mt-2 text-xs"
          onClick={(event) => event.stopPropagation()}
        >
          Noch nicht in der Ludothek auffindbar —{" "}
          <Link
            href="#privateCollectionVisible"
            className="text-foreground underline"
          >
            „Private BGG-Collection anderen Meeple anzeigen“
          </Link>{" "}
          unten aktivieren, damit sie über „Auch Privatbesitz anzeigen“ gefunden
          werden.
        </p>
      )}

      {bggUsername && (
        <div className="mt-4 flex flex-col gap-1.5 border-t pt-4">
          <StopRowNavigation className="flex items-center gap-1.5">
            <ActionButton
              action={() => runImport(false)}
              variant="outline"
              size="sm"
              className="w-fit"
              pendingLabel="Importiere…"
              disabled={Boolean(cooldownEndsAt)}
            >
              BGG-Collection importieren
            </ActionButton>
            {canForceImport && (
              <ActionButton
                action={() => runImport(true)}
                variant="outline"
                size="icon-sm"
                pendingLabel="…"
                title="Import ohne Cooldown (Dev-Environment/sysadmin)"
              >
                !
              </ActionButton>
            )}
          </StopRowNavigation>
          {cooldownEndsAt && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Import gerade nicht möglich — nächster Import ab{" "}
              {formatTimePlain(cooldownEndsAt)} (1h Cooldown zwischen zwei
              Importen).
            </p>
          )}
          {importMessage && (
            <p className="text-sm text-emerald-600">{importMessage}</p>
          )}
        </div>
      )}

      {/* StopRowNavigation: die Karte selbst ist klickbar (setOpen(true)) —
          DialogContent rendert zwar per Portal außerhalb der Karte im DOM,
          bleibt im React-Baum aber ihr Kind, ein Klick darin bubbelt also
          trotzdem zur Karte hoch. Ohne diesen Stop setzte der Klick auf das
          X den Dialog per Base UI zu, die Karte im selben Tick aber sofort
          wieder auf offen — nur Esc (kein Klick-Bubbling) schloss ihn
          tatsächlich. */}
      <StopRowNavigation>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="ring-border shadow-2xl ring-2 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Meine privaten Spiele ({entries.length})
              </DialogTitle>
              <DialogDescription>
                Aus deiner BGG-Collection importierte Titel (nur besessene
                Spiele, keine Exemplar-Verwaltung).
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
                    variant={
                      sortMode === "alphabetical" ? "default" : "outline"
                    }
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
                    variant={
                      statusFilters.has("forTrade") ? "default" : "outline"
                    }
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
                          <span className="truncate">
                            {entry.boardGame.title}
                          </span>
                          <ExternalLink className="size-3.5 shrink-0" />
                        </Link>
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
      </StopRowNavigation>
    </div>
  );
}

/** (#122) Ein-Klick-Freigabe eines einzelnen Titels für das nächste Event —
 * kein separater "Speichern"-Schritt, jeder Klick ist eine eigene
 * Server-Action-Ausführung wie überall sonst im Projekt (`ActionButton`).
 * `refresh={false}` + `onToggled` statt router.refresh() (siehe Kommentar in
 * `PrivateCollectionCard` — offener Dialog + Refresh brach das X). */
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
  status: "OFFERED" | "LOANED" | null;
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
