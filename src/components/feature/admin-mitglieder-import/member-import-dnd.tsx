"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  familyTargetFor,
  importRowName,
  type ImportFamily,
} from "@/lib/members/member-import-families";
import type {
  ImportDecisions,
  ImportPreviewRow,
  MemberImportPreview,
  RowDecision,
} from "@/lib/members/member-import-types";

/**
 * Drag & Drop der Familienzuordnung (@dnd-kit, wie im Schichtplan): Personen
 * lassen sich am Griff in jede Spalte jeder Familie ziehen — innerhalb der
 * Familie ändert das nur die Rolle, in eine andere Familie verschiebt es die
 * Person dorthin. Die Buttons der Personenkarten bleiben der zugängliche Weg
 * (Tastatur, Screenreader).
 */

type Role = RowDecision["role"];
type DragData = { line: number };
/** Spalte einer Familie oder die Ablage „Nicht importieren". */
export type DropTarget = { familyKey: string; role: Role } | { skip: true };

export function ImportDndProvider({
  preview,
  decisions,
  families,
  onChange,
  children,
}: {
  preview: MemberImportPreview;
  decisions: ImportDecisions;
  families: ImportFamily[];
  onChange: (line: number, patch: Partial<RowDecision>) => void;
  children: ReactNode;
}) {
  const [active, setActive] = useState<ImportPreviewRow | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    const { line } = event.active.data.current as DragData;
    setActive(preview.rows.find((row) => row.line === line) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    const { line } = event.active.data.current as DragData;
    const drop = event.over?.data.current as DropTarget | undefined;
    if (!drop) return;
    if ("skip" in drop) {
      onChange(line, { skip: true });
      return;
    }
    const target = families.find((family) => family.key === drop.familyKey);
    if (!target) return;
    if (target.lines.includes(line)) {
      if (decisions[line]?.role !== drop.role) {
        onChange(line, { role: drop.role });
      }
      return;
    }
    onChange(line, {
      family: familyTargetFor(preview, decisions, line, target),
      role: drop.role,
      keepsSharedEmail: false,
    });
  }

  return (
    <DndContext
      id="member-import"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay>
        {active && (
          <div className="bg-card w-fit rounded-md border px-3 py-2 text-sm font-medium shadow-lg">
            {importRowName(active)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** Griff zum Ziehen einer Person; die Karte selbst bleibt bedienbar
 * (E-Mail-Feld, Checkboxen). */
export function DragHandle({ row }: { row: ImportPreviewRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `row:${row.line}`,
    data: { line: row.line } satisfies DragData,
  });
  return (
    <Button
      ref={setNodeRef}
      type="button"
      variant="outline"
      size="icon-xs"
      aria-label={`${importRowName(row)} ziehen`}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical />
    </Button>
  );
}

/** Ablagefläche (Familienspalte oder „Nicht importieren") — hebt sich beim
 * Darüberziehen ab. */
export function DropColumn({
  target,
  title,
  emptyHint = "Hierher ziehen",
  className,
  children,
}: {
  target: DropTarget;
  title: string;
  emptyHint?: string;
  className?: string;
  children: ReactNode[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id:
      "skip" in target
        ? "skip"
        : `${target.familyKey}::${target.role ?? "open"}`,
    data: target,
  });
  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        "bg-muted/40 flex min-h-24 flex-col gap-2 rounded-lg p-2 transition-colors",
        isOver && "bg-primary/10 ring-primary ring-2",
        className,
      )}
    >
      <h3 className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children.length > 0 ? (
        children
      ) : (
        <p className="text-muted-foreground px-1 py-2 text-sm">{emptyHint}</p>
      )}
    </section>
  );
}
