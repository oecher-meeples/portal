"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { PillToggle } from "@/components/ui/pill-toggle";
import { BulkRelocateScanView } from "@/components/feature/admin-bestand/bulk-relocate-scan-view";
import { AssignShelfToEventView } from "@/components/feature/admin-bestand/assign-shelf-to-event-view";
import { PageContainer } from "@/components/ui/page-container";

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
  /** Nur die Event-Ausgabe (Stufe 1) bietet die Regal-Zuordnung (Stufe 2)
   * zusätzlich an — Event-Rückgabe hat keine Event-Auswahl und braucht sie
   * nicht (#273). */
  offerShelfAssignment = false,
}: {
  title: string;
  description: string;
  basePath: string;
  events: EventOption[];
  selectedEventId: string | null;
  /** `null`, solange kein Event gewählt ist. */
  targetUnitId: string | null;
  targetLabel: string;
  offerShelfAssignment?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"spiele" | "regal">("spiele");

  return (
    <PageContainer className="gap-6">
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

      {targetUnitId && offerShelfAssignment && (
        <PillToggle
          options={[
            { label: "Spiele scannen", value: "spiele" },
            { label: "Regal zuordnen", value: "regal" },
          ]}
          value={mode}
          onChange={setMode}
        />
      )}

      {targetUnitId && mode === "spiele" && (
        <BulkRelocateScanView
          targetUnitId={targetUnitId}
          targetLabel={targetLabel}
        />
      )}
      {targetUnitId && offerShelfAssignment && mode === "regal" && (
        <AssignShelfToEventView eventUnitId={targetUnitId} />
      )}
    </PageContainer>
  );
}
