"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";
import { cn } from "@/lib/utils/cn";
import { syncPrivateBggCollection } from "@/lib/ludothek/private-collection-sync";
import { formatTimePlain } from "@/lib/utils/format";
import type { OwnPrivateCollectionEntry } from "@/lib/ludothek/private-collection";
import type { OwnPrivateLoanOffer } from "@/lib/ludothek/private-event-loans";
import { setPrivateCollectionVisibleAction } from "@/components/widgets/private-collection/private-collection-actions";
import { PrivateCollectionDialog } from "@/components/widgets/private-collection/private-collection-dialog";

/**
 * Übersichts-Karte "Meine privaten Spiele" im Profil (#255-Folge). Löst zwei
 * gemeldete Probleme des bisherigen Inline-Buttons im Formular: der Import
 * lief gegen den *gespeicherten* `bggUsername` (`getCurrentMeeple()`), der
 * Button stand aber im ungespeicherten Formular — Klick vor dem Speichern
 * schlug fehl. Und es gab kein Erfolgs-Feedback. Der Import-Button erscheint
 * jetzt hier, unabhängig vom Formular, nur wenn ein `bggUsername` bereits
 * persistiert ist; `ActionButton` liefert Lade- und Fehlerzustand von sich
 * aus, Erfolg zeigt die importierte Anzahl direkt auf der Karte. Klick auf
 * die Karte öffnet die Liste (`PrivateCollectionDialog`).
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
   * (#255-Folge); umschaltbar direkt auf der Karte. */
  visibleToOthers: boolean;
  /** (#122) Nächstes kommendes Event — einziger Freigabe-Kontext, `null`/
   * fehlend ohne kommendes Event (dann keine Freigabe-Steuerung). */
  nextEvent?: { id: string; title: string } | null;
  /** Eigene Freigaben für `nextEvent`, sofern vorhanden. */
  ownOffers?: OwnPrivateLoanOffer[];
}) {
  const [open, setOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

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

      <PrivateCollectionVisibleSwitch initialVisible={visibleToOthers} />

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
        <PrivateCollectionDialog
          open={open}
          onOpenChange={setOpen}
          entries={entries}
          nextEvent={nextEvent}
          ownOffers={ownOffers}
        />
      </StopRowNavigation>
    </div>
  );
}

/** Freigabe der ganzen Collection für andere Meeple (#255) — speichert sofort
 * beim Umschalten, wie die Sichtbarkeits-Auswahl der Meeple-Daten. Ohne
 * Freigabe sind die Spiele in der Ludothek nicht auffindbar.
 * `refresh: false`/lokaler State aus demselben Grund wie bei den
 * Event-Freigaben im `PrivateCollectionDialog`. */
function PrivateCollectionVisibleSwitch({
  initialVisible,
}: {
  initialVisible: boolean;
}) {
  const [visible, setVisible] = useState(initialVisible);
  const { run, pending, error } = useAction({ refresh: false });

  async function handleChange(next: boolean) {
    setVisible(next);
    const ok = await run(() => setPrivateCollectionVisibleAction(next));
    if (!ok) setVisible(!next);
  }

  return (
    <StopRowNavigation className="mt-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Switch
          id="private-collection-visible"
          checked={visible}
          disabled={pending}
          onCheckedChange={handleChange}
        />
        <Label htmlFor="private-collection-visible">
          Private BGG-Collection anderen Meeple anzeigen
        </Label>
      </div>
      {!visible && (
        <p className="text-muted-foreground text-xs">
          Aus, deine Spiele sind in der Ludothek über „Auch Privatbesitz
          anzeigen“ nicht auffindbar.
        </p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </StopRowNavigation>
  );
}
