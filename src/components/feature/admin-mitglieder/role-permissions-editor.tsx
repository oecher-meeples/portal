"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type PermissionOption = {
  id: string;
  key: string;
  description: string;
};

/**
 * Zwei Listen (verfügbar/zugewiesen) mit Verschiebe-Buttons — reiner
 * kontrollierter Client-State, keine eigene Persistierung. Der Aufrufer
 * (Rollen-Dialog, #219) übernimmt das Speichern über setRolePermissions.
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

  function moveToAssigned() {
    if (availableSelection.size === 0) return;
    onValueChange([...value, ...availableSelection]);
    setAvailableSelection(new Set());
  }

  function moveToAvailable() {
    if (assignedSelection.size === 0) return;
    onValueChange(value.filter((id) => !assignedSelection.has(id)));
    setAssignedSelection(new Set());
  }

  return (
    <div className="flex items-start gap-2">
      <PermissionListbox
        label="Verfügbar"
        options={available}
        selected={availableSelection}
        onSelectedChange={setAvailableSelection}
      />
      <div className="flex flex-col gap-1.5 pt-7">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={moveToAssigned}
          disabled={availableSelection.size === 0}
          aria-label="Ausgewählte Rechte zuweisen"
        >
          →
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={moveToAvailable}
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
      />
    </div>
  );
}

/** Barrierefreies Listbox-Pattern (roving tabindex) statt <select multiple> — #218 hängt Drag & Drop an dieselben <li>-Optionen an. */
function PermissionListbox({
  label,
  options,
  selected,
  onSelectedChange,
}: {
  label: string;
  options: PermissionOption[];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
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
              "cursor-pointer rounded px-2 py-1 text-sm outline-none",
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
