"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { StatValue } from "@/components/ui/stat-tile";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  setPrivateCollectionShareAction,
  setPrivateCollectionVisibleAction,
} from "@/components/widgets/private-collection/private-collection-actions";
import { PrivateCollectionDialog } from "@/components/widgets/private-collection/private-collection-dialog";
import {
  ImportJobStatus,
  isImportActive,
  type ImportJobSummary,
} from "@/components/widgets/private-collection/import-job-status";

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
  shareWantToPlay = false,
  shareForTrade = false,
  nextEvent = null,
  ownOffers = [],
  latestImportJob = null,
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
  /** Opt-in: „Want to Play"/„For Trade" anderen Meeple zeigen (#632-Folge). */
  shareWantToPlay?: boolean;
  shareForTrade?: boolean;
  /** (#122) Nächstes kommendes Event — einziger Freigabe-Kontext, `null`/
   * fehlend ohne kommendes Event (dann keine Freigabe-Steuerung). */
  nextEvent?: { id: string; title: string } | null;
  /** Eigene Freigaben für `nextEvent`, sofern vorhanden. */
  ownOffers?: OwnPrivateLoanOffer[];
  /** (#632) Jüngster Import-Job — der Import läuft serverseitig in einer
   * Queue, die Karte zeigt nur den Zustand. */
  latestImportJob?: ImportJobSummary | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // Bearbeitungen im Dialog werden dort lokal nachgeführt; die Serverdaten
  // (Zähler auf der Karte) laden wir erst beim Schließen neu — ein Refresh bei
  // offenem Dialog ließ dessen Schließen-Button ausfallen.
  const dirtyRef = useRef(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && dirtyRef.current) {
      dirtyRef.current = false;
      router.refresh();
    }
  }
  const importActive = isImportActive(latestImportJob);

  const clickable = entries.length > 0;

  return (
    <Card
      className={cn("block", clickable && CARD_HOVER_CLASS)}
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
      <CardTitle>Meine privaten Spiele</CardTitle>
      <div className="mt-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Aus BGG importiert
        </p>
        <StatValue>{entries.length}</StatValue>
      </div>

      <PrivateCollectionVisibleSwitch initialVisible={visibleToOthers} />
      <PrivateCollectionShareSwitch
        id="private-collection-want-to-play"
        label="Meine „Want to Play“ zeigen"
        initial={shareWantToPlay}
        save={(next) =>
          setPrivateCollectionShareAction("shareWantToPlay", next)
        }
      />
      <PrivateCollectionShareSwitch
        id="private-collection-for-trade"
        label="Meine „For Trade“ zeigen"
        initial={shareForTrade}
        save={(next) => setPrivateCollectionShareAction("shareForTrade", next)}
      />

      {bggUsername && (
        <div className="mt-4 flex flex-col gap-1.5 border-t pt-4">
          <StopRowNavigation className="flex items-center gap-1.5">
            <ActionButton
              refresh
              action={() => syncPrivateBggCollection(false)}
              variant="outline"
              size="sm"
              className="w-fit"
              pendingLabel="Importiere…"
              disabled={Boolean(cooldownEndsAt) || importActive}
            >
              BGG-Collection importieren
            </ActionButton>
            {canForceImport && (
              <ActionButton
                refresh
                action={() => syncPrivateBggCollection(true)}
                disabled={importActive}
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
          <ImportJobStatus job={latestImportJob} />
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
          onOpenChange={handleOpenChange}
          onChanged={() => {
            dirtyRef.current = true;
          }}
          entries={entries}
          nextEvent={nextEvent}
          ownOffers={ownOffers}
        />
      </StopRowNavigation>
    </Card>
  );
}

/** Freigabe-Schalter der Collection (#255, #632-Folge) — speichert sofort
 * beim Umschalten, wie die Sichtbarkeits-Auswahl der Meeple-Daten.
 * `refresh: false`/lokaler State aus demselben Grund wie bei den
 * Event-Freigaben im `PrivateCollectionDialog`. */
function PrivateCollectionShareSwitch({
  id,
  label,
  hint,
  initial,
  save,
}: {
  id: string;
  label: string;
  /** Erklärung, solange der Schalter aus ist. */
  hint?: string;
  initial: boolean;
  save: (next: boolean) => Promise<{ error: string } | { success: true }>;
}) {
  const [checked, setChecked] = useState(initial);
  const { run, pending, error } = useAction({ refresh: false });

  async function handleChange(next: boolean) {
    setChecked(next);
    const ok = await run(() => save(next));
    if (!ok) setChecked(!next);
  }

  return (
    <StopRowNavigation className="mt-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={checked}
          disabled={pending}
          onCheckedChange={handleChange}
        />
        <Label htmlFor={id}>{label}</Label>
      </div>
      {!checked && hint && (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </StopRowNavigation>
  );
}

/** Freigabe der ganzen Collection für andere Meeple (#255). Ohne Freigabe
 * sind die Spiele in der Ludothek nicht auffindbar. */
function PrivateCollectionVisibleSwitch({
  initialVisible,
}: {
  initialVisible: boolean;
}) {
  return (
    <PrivateCollectionShareSwitch
      id="private-collection-visible"
      label="Private BGG-Collection anderen Meeple anzeigen"
      hint="Aus, deine Spiele sind in der Ludothek über „Auch Privatbesitz anzeigen“ nicht auffindbar."
      initial={initialVisible}
      save={setPrivateCollectionVisibleAction}
    />
  );
}
