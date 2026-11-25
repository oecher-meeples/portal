"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarPlus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils/cn";
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

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
});

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(monthStart: Date) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
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
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
  const cells = buildMonthGrid(viewMonth);
  const todayKey = toDateKey(new Date());

  return (
    <Card className="mx-auto max-w-sm gap-0 self-start lg:sticky lg:top-24">
      <CardTitle>Google-Kalender</CardTitle>

      <div className="mt-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Vorheriger Monat"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize">
          {MONTH_FORMATTER.format(viewMonth)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Nächster Monat"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-muted-foreground py-1">
            {label}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={index} />;
          const key = toDateKey(date);
          const hasPublicEvent = publicEventDates.has(key);
          const hasInternalEvent = internalEventDates.has(key);
          const hasEvent = hasPublicEvent || hasInternalEvent;
          const isSelected = selectedDate === key;
          const isToday = key === todayKey;
          // Aktiver Filter: alle anderen Tage mit Terminen treten optisch
          // zurück, damit der ausgewählte Tag als einziger aktiver Filter
          // erkennbar bleibt (statt gleichwertig neben ihm zu stehen).
          const isDimmed = selectedDate !== null && !isSelected;

          return (
            <button
              key={key}
              type="button"
              disabled={!hasEvent}
              onClick={() => onSelectDate(isSelected ? null : key)}
              className={cn(
                "hover:bg-accent relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-[opacity,background-color]",
                hasEvent && "font-semibold",
                !hasEvent && "text-muted-foreground",
                isSelected && "bg-primary text-primary-foreground",
                isToday && !isSelected && "ring-primary ring-1",
                isDimmed && "opacity-35",
              )}
            >
              {date.getDate()}
              {hasEvent && (
                <span className="flex gap-0.5" aria-hidden>
                  {hasPublicEvent && (
                    <span className="bg-event-public size-1.5 rounded-full" />
                  )}
                  {hasInternalEvent && (
                    <span className="bg-event-internal size-1.5 rounded-full" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

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
