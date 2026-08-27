"use client";

import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { BulkRelocateScanView } from "@/components/feature/admin-bestand/bulk-relocate-scan-view";

export type EventOption = { id: string; title: string };

/**
 * Event-Auswahl + Sammel-Umlagern-Scan-Ansicht — geteilt von "Event-Ausgabe"
 * (Ziel = Event-Unit) und einer künftigen Regal-Zuordnung, sofern die auch
 * eine Event-Auswahl braucht (#273). "Event-Rückgabe" nutzt stattdessen
 * `BulkRelocateScanView` direkt mit einer Lagereinheit als Ziel, keine
 * Event-Auswahl nötig.
 */
export function EventScanPageView({
  title,
  description,
  basePath,
  events,
  selectedEventId,
  targetUnitId,
  targetLabel,
}: {
  title: string;
  description: string;
  basePath: string;
  events: EventOption[];
  selectedEventId: string | null;
  /** `null`, solange kein Event gewählt ist. */
  targetUnitId: string | null;
  targetLabel: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Bestand & Inventur"
        title={title}
        description={description}
      />

      {events.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Aktuell kein anstehendes Event gefunden.
        </p>
      )}

      {events.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {events.map((event) => (
            <Button
              key={event.id}
              size="sm"
              variant={event.id === selectedEventId ? "default" : "outline"}
              onClick={() => router.push(`${basePath}?event=${event.id}`)}
            >
              {event.title}
            </Button>
          ))}
        </div>
      )}

      {targetUnitId && (
        <BulkRelocateScanView
          targetUnitId={targetUnitId}
          targetLabel={targetLabel}
        />
      )}
    </div>
  );
}
