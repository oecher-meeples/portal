"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { CalendarPlus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { MonthCalendar } from "@/components/ui/month-calendar";
import type { ContentItem } from "@/lib/content/content-types";
import { subscribeOwnInternalCalendar } from "@/components/feature/news/actions";

function toWebcalUrl(url: string) {
  return url.replace(/^https?:\/\//, "webcal://");
}

/** #439: persönliches Abo des internen Kalenders. Den Roh-Token gibt es nur
 * im Moment des Erzeugens (DB hält nur den Hash, #438) — jeder Klick erzeugt
 * deshalb einen neuen Link; ein bestehender wird ersetzt, darum der Dialog. */
function InternalCalendarSubscribe({ hasToken }: { hasToken: boolean }) {
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);

  async function handleSubscribe() {
    const result = await subscribeOwnInternalCalendar();
    if ("error" in result) return result;
    setSubscribeUrl(result.subscribeUrl);
    window.location.href = toWebcalUrl(result.subscribeUrl);
    return result;
  }

  return (
    <>
      <ActionDialog
        trigger={
          <Button variant="outline" className="mt-2 w-full gap-1.5">
            <CalendarPlus className="size-4" />
            Kalender abonnieren (intern)
          </Button>
        }
        title="Internen Kalender abonnieren"
        description={
          hasToken
            ? "Du hast schon einen Abo-Link. Ein neuer Link ersetzt ihn – ein bestehendes Abo in deiner Kalender-App bekommt danach keine Termine mehr."
            : "Wir erzeugen einen persönlichen Abo-Link für dich. Bitte nicht weitergeben – er zeigt alle internen Vereinstermine. Der Kalender wird abonniert, nicht importiert: Neue und geänderte Termine erscheinen automatisch (je nach Kalender-App mit Verzögerung von bis zu einem Tag)."
        }
        submitLabel={hasToken ? "Neuen Link erzeugen" : "Link erzeugen"}
        pendingLabel="Erzeuge…"
        action={handleSubscribe}
        refresh
      />
      {subscribeUrl && (
        <div className="bg-muted mt-2 flex flex-col gap-2 rounded-md p-3 text-xs">
          <span>
            Öffnet sich keine Kalender-App, den Link dort per „Kalender per URL
            abonnieren“ hinzufügen (Google: Weitere Kalender → Per URL; Apple:
            Ablage → Neues Kalenderabonnement). Nicht als Datei herunterladen –
            das wäre ein einmaliger Import ohne Updates.
          </span>
          <span className="font-mono break-all">{subscribeUrl}</span>
          <CopyButton value={subscribeUrl} label="Kopieren" icon={Copy} />
        </div>
      )}
    </>
  );
}

export function NewsCalendar({
  items,
  selectedDate,
  onSelectDate,
  icsUrl,
  internalSubscription,
}: {
  items: Omit<ContentItem, "body">[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  icsUrl?: string;
  /** Nur für Meeple mit `news:internal:view` gesetzt (#439). */
  internalSubscription?: { hasToken: boolean };
}) {
  // #10 (Folgefehler beim Live-Test): volle Zellfarbe (bg-secondary) machte
  // die Zifferfarbe auf sich selbst unlesbar (Weiß auf Weiß im Dark Mode, da
  // secondary = foreground-Farbe). Zwei kleine Punkte unter der Zahl statt
  // Zellfarbe umgehen das strukturell — die Tagesfarbe (Text/Ring) bleibt
  // unverändert lesbar, unabhängig davon welche Termine der Tag hat.
  const publicEventDates = new Set(
    items.filter((item) => !item.internal).map((item) => item.date),
  );
  const internalEventDates = new Set(
    items.filter((item) => item.internal).map((item) => item.date),
  );

  return (
    <Card className="mx-auto max-w-sm gap-0 self-start lg:sticky lg:top-24">
      <CardTitle>Google-Kalender</CardTitle>

      <MonthCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        isDayEnabled={(key) =>
          publicEventDates.has(key) || internalEventDates.has(key)
        }
        renderMarker={(key) => (
          <span className="flex gap-0.5" aria-hidden>
            {publicEventDates.has(key) && (
              <span className="bg-event-public size-1.5 rounded-full" />
            )}
            {internalEventDates.has(key) && (
              <span className="bg-event-internal size-1.5 rounded-full" />
            )}
          </span>
        )}
      />

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-event-public size-2 rounded-full" aria-hidden />
          Öffentlich
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-event-internal size-2 rounded-full" aria-hidden />
          Intern
        </span>
      </div>

      <p className="text-muted-foreground mt-3 text-sm">
        Automatisch synchronisiert aus dem Vereinskalender. Tage mit Terminen
        sind markiert – anklicken filtert die Liste.
      </p>

      {icsUrl && (
        <Button
          variant="outline"
          className="mt-3 w-full gap-1.5"
          render={
            <a href={toWebcalUrl(icsUrl)}>
              <CalendarPlus className="size-4" />
              Kalender abonnieren (
              {internalSubscription ? "öffentlich" : "iCal"})
            </a>
          }
        />
      )}
      {internalSubscription && (
        <InternalCalendarSubscribe hasToken={internalSubscription.hasToken} />
      )}
    </Card>
  );
}
