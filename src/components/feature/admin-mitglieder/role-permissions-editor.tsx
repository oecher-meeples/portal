"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type PermissionOption = {
  id: string;
  key: string;
  description: string;
};

/** Eigener MIME-Typ für den Drag-Payload — vermeidet Kollisionen mit Drops aus anderen Quellen (z. B. Text, Dateien). */
const DRAG_MIME = "application/x-role-permission-ids";

/**
 * Zwei Listen (verfügbar/zugewiesen) mit Verschiebe-Buttons und nativem
 * HTML5-Drag&Drop — reiner kontrollierter Client-State, keine eigene
 * Persistierung. Der Aufrufer (Rollen-Dialog, #219) übernimmt das Speichern
 * über setRolePermissions.
 *
 * Der Zustand wird ausschließlich im "drop"-Handler verändert, nie in
 * "dragstart" — ein Abbruch per Esc oder ein Drop außerhalb einer Liste
 * löst dadurch nie ein "drop"-Event aus und lässt den Zustand unverändert.
 */
export function RolePermissionsEditor({
  options,
  value,
  onValueChange,
}: {
  options: PermissionOption[];
  value: string[];
  onValueChange: (next: string[]) => void;
}) {
  const [availableSelection, setAvailableSelection] = useState<Set<string>>(
    new Set(),
  );
  const [assignedSelection, setAssignedSelection] = useState<Set<string>>(
    new Set(),
  );

  const assignedIds = new Set(value);
  const available = options.filter((option) => !assignedIds.has(option.id));
  const assigned = options.filter((option) => assignedIds.has(option.id));

  function moveToAssigned(ids: Iterable<string> = availableSelection) {
    const idsToMove = new Set(ids);
    if (idsToMove.size === 0) return;
    onValueChange([...new Set([...value, ...idsToMove])]);
    setAvailableSelection((prev) => withoutIds(prev, idsToMove));
  }

  function moveToAvailable(ids: Iterable<string> = assignedSelection) {
    const idsToMove = new Set(ids);
    if (idsToMove.size === 0) return;
    onValueChange(value.filter((id) => !idsToMove.has(id)));
    setAssignedSelection((prev) => withoutIds(prev, idsToMove));
  }

  return (
    <div className="flex items-start gap-2">
      <PermissionListbox
        label="Verfügbar"
        options={available}
        selected={availableSelection}
        onSelectedChange={setAvailableSelection}
        onDropIds={moveToAvailable}
      />
      <div className="flex flex-col gap-1.5 pt-7">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => moveToAssigned()}
          disabled={availableSelection.size === 0}
          aria-label="Ausgewählte Rechte zuweisen"
        >
          →
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => moveToAvailable()}
          disabled={assignedSelection.size === 0}
          aria-label="Ausgewählte Rechte entfernen"
        >
          ←
        </Button>
      </div>
      <PermissionListbox
        label="Zugewiesen"
        options={assigned}
        selected={assignedSelection}
        onSelectedChange={setAssignedSelection}
        onDropIds={moveToAssigned}
      />
    </div>
  );
}

function withoutIds(set: Set<string>, idsToRemove: Set<string>) {
  const next = new Set(set);
  idsToRemove.forEach((id) => next.delete(id));
  return next;
}

/** Barrierefreies Listbox-Pattern (roving tabindex) statt <select multiple> — <option> unterstützt kein natives Drag&Drop. */
function PermissionListbox({
  label,
  options,
  selected,
  onSelectedChange,
  onDropIds,
}: {
  label: string;
  options: PermissionOption[];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  /** Aufgerufen, wenn Einträge aus der jeweils anderen Liste hier abgelegt werden. */
  onDropIds: (ids: string[]) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const safeActiveIndex = Math.max(
    0,
    Math.min(activeIndex, options.length - 1),
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, options.length - 1));
    setActiveIndex(clamped);
    itemRefs.current[clamped]?.focus();
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">
        {label} ({options.length})
      </span>
      <ul
        role="listbox"
        aria-multiselectable="true"
        aria-label={label}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const raw = event.dataTransfer.getData(DRAG_MIME);
          if (!raw) return;
          try {
            const ids = JSON.parse(raw);
            if (Array.isArray(ids) && ids.length > 0) onDropIds(ids);
          } catch {
            // Fremder/kaputter Drag-Payload — ignorieren statt crashen.
          }
        }}
        className="border-input bg-background h-48 w-64 overflow-y-auto rounded-md border p-1"
      >
        {options.map((option, index) => (
          <li
            key={option.id}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            role="option"
            aria-selected={selected.has(option.id)}
            tabIndex={index === safeActiveIndex ? 0 : -1}
            title={option.description}
            draggable
            onDragStart={(event) => {
              const idsToDrag = selected.has(option.id)
                ? Array.from(selected)
                : [option.id];
              event.dataTransfer.setData(DRAG_MIME, JSON.stringify(idsToDrag));
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => {
              setActiveIndex(index);
              toggle(option.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                focusIndex(index + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                focusIndex(index - 1);
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle(option.id);
              }
            }}
            className={cn(
              "cursor-grab rounded px-2 py-1 text-sm outline-none active:cursor-grabbing",
              selected.has(option.id)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
              index === safeActiveIndex && "ring-ring/50 ring-2",
            )}
          >
            {option.key}
          </li>
        ))}
        {options.length === 0 && (
          <li className="text-muted-foreground px-2 py-1 text-sm">
            Keine Einträge
          </li>
        )}
      </ul>
    </div>
  );
}
