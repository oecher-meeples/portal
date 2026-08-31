"use client";

import { useEffect, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { useAction } from "@/components/ui/use-action";
import type { TshirtSizeRow } from "@/lib/members/tshirt-sizes";
import {
  createTshirtSize,
  deleteTshirtSize,
  loadTshirtSizes,
  renameTshirtSize,
  reorderTshirtSizes,
} from "@/components/feature/admin-settings/tshirt-size-actions";

function DeleteSizeButton({ size }: { size: TshirtSizeRow }) {
  const trigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`„${size.label}“ löschen`}
    >
      <Trash2 />
    </Button>
  );

  if (size.memberCount === 0) {
    return (
      <ActionButton
        action={() => deleteTshirtSize(size.id)}
        variant="ghost"
        size="icon-sm"
        aria-label={`„${size.label}“ löschen`}
      >
        <Trash2 />
      </ActionButton>
    );
  }

  return (
    <ActionDialog
      trigger={trigger}
      title={`„${size.label}“ löschen?`}
      description={`${size.memberCount} ${
        size.memberCount === 1 ? "Mitglied hat" : "Mitglieder haben"
      } diese Größe hinterlegt — wird beim Löschen zurückgesetzt, die Mitglieder selbst bleiben unangetastet.`}
      submitLabel="Löschen"
      submitVariant="destructive"
      action={() => deleteTshirtSize(size.id)}
    />
  );
}

/** Eigener MIME-Typ für den Drag-Payload — analog role-management-section.tsx. */
const REORDER_DRAG_MIME = "application/x-tshirt-size-id";

/** Eine einzelne, gemeinsame Drop-Zone zwischen zwei Zeilen (bzw. vor der
 * ersten/nach der letzten) — bewusst nicht pro Zeile eine eigene
 * Vorher/Nachher-Hälfte, das erzeugte zwei sich überlappende Zonen an
 * jeder Grenze und war verwirrend. */
function DropGap({
  active,
  onDragOverGap,
  onDropGap,
}: {
  active: boolean;
  onDragOverGap: () => void;
  onDropGap: () => void;
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragOverGap();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.getData(REORDER_DRAG_MIME)) onDropGap();
      }}
      className="relative h-3"
    >
      <div
        className={cn(
          "absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-colors",
          active ? "bg-primary" : "bg-transparent",
        )}
      />
    </div>
  );
}

function SizeRow({
  size,
  onDragStart,
  onDragEnd,
}: {
  size: TshirtSizeRow;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [label, setLabel] = useState(size.label);
  const { run, pending, error } = useAction({ refresh: false });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span
          draggable
          onDragStart={(event) => {
            onDragStart();
            event.dataTransfer.setData(REORDER_DRAG_MIME, size.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={onDragEnd}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
          aria-label={`„${size.label}“ per Drag-and-Drop verschieben`}
          role="button"
          tabIndex={0}
        >
          <GripVertical className="size-4" />
        </span>
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={() => {
            if (label.trim() && label !== size.label) {
              run(() => renameTshirtSize(size.id, label));
            }
          }}
          className="max-w-40"
        />
        <span className="text-muted-foreground text-xs">
          {size.memberCount} Mitglied{size.memberCount === 1 ? "" : "er"}
        </span>
        <DeleteSizeButton size={size} />
      </div>
      {pending && <p className="text-muted-foreground text-xs">Speichere…</p>}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function TshirtSizeManagement() {
  const [sizes, setSizes] = useState<TshirtSizeRow[] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [draggedSizeId, setDraggedSizeId] = useState<string | null>(null);
  const [dragOverGapIndex, setDragOverGapIndex] = useState<number | null>(null);
  const {
    run: runCreate,
    pending: creating,
    error: createError,
  } = useAction({
    refresh: false,
  });

  useEffect(() => {
    let cancelled = false;
    loadTshirtSizes().then((loaded) => {
      if (!cancelled) setSizes(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reload() {
    setSizes(await loadTshirtSizes());
  }

  async function handleCreate() {
    if (!newLabel.trim()) return;
    const succeeded = await runCreate(() => createTshirtSize(newLabel));
    if (succeeded) {
      setNewLabel("");
      await reload();
    }
  }

  /** `gapIndex` bezieht sich auf die Lücke *vor* `sizes[gapIndex]` in der
   * aktuellen Reihenfolge (Länge = ans Ende anhängen). Nach dem
   * Herausnehmen der gedraggten Größe verschieben sich alle Indizes
   * dahinter um eins nach vorn — das gleicht `adjustedIndex` aus. */
  async function moveDraggedSizeToGap(gapIndex: number) {
    if (!sizes || !draggedSizeId) return;
    const draggedIndex = sizes.findIndex((size) => size.id === draggedSizeId);
    if (draggedIndex === -1) return;

    const dragged = sizes[draggedIndex];
    const withoutDragged = sizes.filter((size) => size.id !== draggedSizeId);
    const adjustedIndex = gapIndex > draggedIndex ? gapIndex - 1 : gapIndex;
    const next = [...withoutDragged];
    next.splice(adjustedIndex, 0, dragged);

    setSizes(next);
    await reorderTshirtSizes(next.map((size) => size.id));
  }

  if (sizes === null) {
    return <p className="text-muted-foreground text-sm">Lade…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {sizes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Noch keine T-Shirt-Größen angelegt.
        </p>
      ) : (
        <div className="flex flex-col">
          {sizes.flatMap((size, index) => [
            <DropGap
              key={`gap-${index}`}
              active={dragOverGapIndex === index}
              onDragOverGap={() => setDragOverGapIndex(index)}
              onDropGap={() => {
                moveDraggedSizeToGap(index);
                setDragOverGapIndex(null);
              }}
            />,
            <SizeRow
              key={size.id}
              size={size}
              onDragStart={() => setDraggedSizeId(size.id)}
              onDragEnd={() => {
                setDraggedSizeId(null);
                setDragOverGapIndex(null);
              }}
            />,
          ])}
          <DropGap
            active={dragOverGapIndex === sizes.length}
            onDragOverGap={() => setDragOverGapIndex(sizes.length)}
            onDropGap={() => {
              moveDraggedSizeToGap(sizes.length);
              setDragOverGapIndex(null);
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 border-t pt-4">
        <Input
          placeholder="Neue Größe, z. B. „S“"
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          className="max-w-48"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={creating || !newLabel.trim()}
          onClick={handleCreate}
        >
          <Plus className="size-3.5" />
          Hinzufügen
        </Button>
      </div>
      {createError && <p className="text-destructive text-sm">{createError}</p>}
    </div>
  );
}

/** T-Shirt-Größen-Verwaltung in /admin/einstellungen (#388) — analog
 * `InviteSettingsDialog`: Karte öffnet einen Popup-Dialog statt einer
 * eigenen Route. `count` (Anzahl angelegter Größen) analog dem
 * Count-Badge auf der "Aufbewahrungseinheiten"-Karte (`SettingsCard`),
 * hier separat, weil diese Karte einen Dialog statt einen Link öffnet;
 * 0 Größen ist ein Warnzustand — das Stammdatenfeld hätte dann keine
 * Auswahl. */
export function TshirtSizeDialog({ count }: { count: number }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className="w-full text-left">
            <Card className="hover:bg-muted/50 relative transition-colors">
              <Badge
                variant={count === 0 ? "warning" : "default"}
                className="absolute top-1/2 right-4 h-7 min-w-7 -translate-y-1/2 px-2.5 text-sm"
              >
                {count}
              </Badge>
              <CardHeader className="pr-14">
                <CardTitle>T-Shirt-Größen</CardTitle>
                <CardDescription>Verfügbare Größen verwalten.</CardDescription>
              </CardHeader>
            </Card>
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>T-Shirt-Größen</DialogTitle>
        </DialogHeader>
        <TshirtSizeManagement />
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
