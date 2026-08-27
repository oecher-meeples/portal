"use client";

import { useDraggable } from "@dnd-kit/core";
import type { RoleColumnGroup } from "@/lib/events/shift-plan";
import { helperColorClass } from "@/lib/events/helper-colors";

export type PoolMeeple = {
  meepleId: string;
  displayName: string;
  /** One row per (meeple, role) — a meeple available for several roles
   * appears once per role, per AC (#158). */
  roleId: string;
  /** Set once this meeple has ≥1 assignment on this day (#161) — yellow marker. */
  alreadyPlanned?: boolean;
};

export type PoolDragData = {
  type: "pool";
  meepleId: string;
  displayName: string;
  roleId: string;
  dayId: string;
};

/**
 * Leiste oberhalb des Kalenders (#158): für jeden Tag alle verfügbaren
 * Meeples, in Spalten je Rolle gruppiert — dieselbe Breiten-Proportion wie
 * die Kalender-Spalten (`buildRoleColumns`), damit Pool und Kalender optisch
 * ausgerichtet sind. Farbige Rechtecke je Helfer (`helperColorClass`,
 * konsistent über Pool und spätere Zuweisung hinweg). Jedes Rechteck ist ein
 * @dnd-kit-Draggable (#159); während des Drags werden andere Vorkommen
 * derselben Person rot markiert (`activeMeepleId`).
 */
export function HelperPoolBar({
  dayId,
  columns,
  pool,
  activeMeepleId,
}: {
  dayId: string;
  columns: RoleColumnGroup[];
  pool: PoolMeeple[];
  activeMeepleId: string | null;
}) {
  if (columns.length === 0) return null;

  const columnCount = columns.reduce((sum, group) => sum + group.capacity, 0);

  return (
    <div
      className="grid gap-x-0"
      style={{
        gridTemplateColumns: `5rem repeat(${columnCount}, minmax(4rem, 1fr))`,
      }}
    >
      <div />
      {columns.map((group) => {
        const forRole = pool.filter((entry) => entry.roleId === group.roleId);
        return (
          <div
            key={group.roleId}
            className="flex flex-wrap gap-1 border-l p-1.5"
            style={{ gridColumn: `span ${group.capacity}` }}
          >
            {forRole.length === 0 ? (
              <span className="text-muted-foreground text-xs">
                Niemand verfügbar
              </span>
            ) : (
              forRole.map((entry) => (
                <PoolEntry
                  key={`${entry.meepleId}-${entry.roleId}`}
                  dayId={dayId}
                  entry={entry}
                  isSameHelperDragging={
                    activeMeepleId !== null && activeMeepleId === entry.meepleId
                  }
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

function PoolEntry({
  dayId,
  entry,
  isSameHelperDragging,
}: {
  dayId: string;
  entry: PoolMeeple;
  /** True for every occurrence of the currently-dragged meeple, including
   * the one being dragged — the dragged node itself is hidden (DragOverlay
   * shows it instead), the others get the red "already elsewhere" marker. */
  isSameHelperDragging: boolean;
}) {
  const dragId = `pool::${dayId}::${entry.roleId}::${entry.meepleId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      type: "pool",
      meepleId: entry.meepleId,
      displayName: entry.displayName,
      roleId: entry.roleId,
      dayId,
    } satisfies PoolDragData,
  });

  if (isDragging) {
    return <span ref={setNodeRef} className="rounded px-2 py-1 opacity-0" />;
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={`rounded px-2 py-1 text-xs font-medium ${helperColorClass(entry.meepleId)} ${
        isSameHelperDragging ? "ring-2 ring-rose-500" : ""
      } ${entry.alreadyPlanned ? "outline outline-amber-500" : ""}`}
    >
      {entry.displayName}
    </button>
  );
}
