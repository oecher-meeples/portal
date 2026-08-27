"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { helperColorClass } from "@/lib/events/helper-colors";
import { cn } from "@/lib/utils/cn";
import type { PlanBooking } from "@/lib/events/shift-plan-types";

const ROW_HEIGHT_PX = 32; // matches the grid's `2rem` row track (shift-plan-grid.tsx)
const STEP_MINUTES = 30;

type ResizeEdge = "top" | "bottom";

/**
 * Ein zugewiesener Zeitblock im Schichtplan-Kalender. Fokussierbar
 * (Entf/Rücktaste entfernt die Zuweisung, #161); bei Fokus erscheinen
 * Outlook-artige Griffpunkte oben/unten, mit denen sich der Block strecken/
 * stauchen lässt (#160) — z. B. um eine Pause für den Helfer einzuplanen —
 * sowie ein sichtbarer Entfernen-Button oben links, da die Tastatur-Abkürzung
 * allein nicht auffindbar genug war. Serverseitige Validierung
 * (Verfügbarkeits-Grenze, Überschneidung) läuft über dieselbe
 * `assignShiftBooking`-Funktion wie die erste Zuweisung.
 */
export function AssignedBlock({
  booking,
  gridColumn,
  rowStart,
  rowEnd,
  maxRow,
  rangeStart,
  onUnassign,
  onResize,
}: {
  booking: PlanBooking;
  gridColumn: number;
  rowStart: number;
  rowEnd: number;
  /** One past the last valid row line (`timeSlots.length + 2`). */
  maxRow: number;
  rangeStart: Date;
  onUnassign: (booking: PlanBooking) => void;
  onResize: (booking: PlanBooking, startsAt: Date, endsAt: Date) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [drag, setDrag] = useState<{
    edge: ResizeEdge;
    startY: number;
    liveStart: number;
    liveEnd: number;
  } | null>(null);
  const dragRef = useRef(drag);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (!drag) return;

    function handleMove(pointerEvent: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;
      const deltaRows = Math.round(
        (pointerEvent.clientY - current.startY) / ROW_HEIGHT_PX,
      );
      if (current.edge === "top") {
        const next = Math.min(
          Math.max(rowStart + deltaRows, 2),
          current.liveEnd - 1,
        );
        setDrag({ ...current, liveStart: next });
      } else {
        const next = Math.max(
          Math.min(rowEnd + deltaRows, maxRow),
          current.liveStart + 1,
        );
        setDrag({ ...current, liveEnd: next });
      }
    }

    function handleUp() {
      const current = dragRef.current;
      setDrag(null);
      if (!current) return;
      if (current.liveStart === rowStart && current.liveEnd === rowEnd) return;

      const startsAt = new Date(
        rangeStart.getTime() + (current.liveStart - 2) * STEP_MINUTES * 60_000,
      );
      const endsAt = new Date(
        rangeStart.getTime() + (current.liveEnd - 2) * STEP_MINUTES * 60_000,
      );
      onResize(booking, startsAt, endsAt);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rowStart/rowEnd/maxRow/rangeStart are stable per render pass
  }, [drag !== null]);

  const displayStart = drag?.liveStart ?? rowStart;
  const displayEnd = drag?.liveEnd ?? rowEnd;
  const confirmed = booking.confirmedAt !== null;

  function startResize(edge: ResizeEdge) {
    return (pointerEvent: React.PointerEvent) => {
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      setDrag({
        edge,
        startY: pointerEvent.clientY,
        liveStart: rowStart,
        liveEnd: rowEnd,
      });
    };
  }

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`${booking.displayName} — ${confirmed ? "bestätigt" : "unbestätigt"} — Entf zum Entfernen`}
      title={confirmed ? "Bestätigt" : "Unbestätigt"}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Delete" || keyEvent.key === "Backspace") {
          keyEvent.preventDefault();
          onUnassign(booking);
        }
      }}
      className={cn(
        "focus-visible:ring-ring relative m-0.5 cursor-default rounded px-1.5 py-1 text-xs font-medium outline-none focus-visible:ring-2",
        helperColorClass(booking.meepleId),
        !confirmed && "border-foreground/50 border-2 border-dashed",
      )}
      style={{
        gridColumn,
        gridRow: `${displayStart} / ${displayEnd}`,
      }}
    >
      {confirmed && <Check className="absolute top-0.5 right-0.5 size-3" />}
      {booking.displayName}
      {focused && (
        <>
          <div
            onPointerDown={startResize("top")}
            className="bg-foreground/40 absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
          />
          <div
            onPointerDown={startResize("bottom")}
            className="bg-foreground/40 absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
          />
          <button
            type="button"
            aria-label={`${booking.displayName} entfernen`}
            title="Zuweisung entfernen"
            // pointerdown statt onClick + preventDefault: ein <button> nimmt
            // sonst beim Mousedown den Fokus, das Elternelement blurt, sein
            // {focused && …} entfernt diesen Button noch vor dem Klick aus
            // dem DOM — der Klick verpufft (Bugreport "Löschen blockiert").
            // Dasselbe Muster wie bei den Resize-Griffen oben.
            onPointerDown={(pointerEvent) => {
              pointerEvent.preventDefault();
              pointerEvent.stopPropagation();
              onUnassign(booking);
            }}
            className="bg-background/80 hover:bg-destructive hover:text-destructive-foreground absolute top-0.5 left-0.5 flex size-3.5 items-center justify-center rounded-full"
          >
            <X className="size-2.5" />
          </button>
        </>
      )}
    </div>
  );
}
