"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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

function SizeRow({
  size,
  isFirst,
  isLast,
  onMove,
}: {
  size: TshirtSizeRow;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const [label, setLabel] = useState(size.label);
  const { run, pending, error } = useAction({ refresh: false });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            aria-label={`„${size.label}“ nach oben verschieben`}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isLast}
            onClick={() => onMove(1)}
            aria-label={`„${size.label}“ nach unten verschieben`}
          >
            <ArrowDown className="size-3.5" />
          </Button>
        </div>
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

  async function handleMove(index: number, direction: -1 | 1) {
    if (!sizes) return;
    const next = [...sizes];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
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
        <div className="flex flex-col gap-3">
          {sizes.map((size, index) => (
            <SizeRow
              key={size.id}
              size={size}
              isFirst={index === 0}
              isLast={index === sizes.length - 1}
              onMove={(direction) => handleMove(index, direction)}
            />
          ))}
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
 * eigenen Route. */
export function TshirtSizeDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className="w-full text-left">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle>T-Shirt-Größen</CardTitle>
                <CardDescription>
                  Verfügbare Größen für das Stammdatenfeld verwalten.
                </CardDescription>
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
