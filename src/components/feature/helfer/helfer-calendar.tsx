"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { MonthCalendar } from "@/components/ui/month-calendar";

/** Monatskalender der Helfer-Tage (#674): nur Tage mit Schichten sind
 * anwählbar; Klick filtert die Event-Liste auf diesen Tag. */
export function HelferCalendar({
  dayKeys,
  selectedDate,
  onSelectDate,
}: {
  dayKeys: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  return (
    <Card className="mx-auto w-full max-w-sm gap-0 self-start">
      <CardTitle>Helfer-Tage</CardTitle>
      <MonthCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        isDayEnabled={(key) => dayKeys.has(key)}
        renderMarker={() => (
          <span className="bg-event-public size-1.5 rounded-full" aria-hidden />
        )}
      />
      <p className="text-muted-foreground mt-3 text-sm">
        Tage mit Schichten sind markiert – anklicken filtert die Liste.
      </p>
    </Card>
  );
}
