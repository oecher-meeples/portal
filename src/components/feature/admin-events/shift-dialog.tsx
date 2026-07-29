"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShiftType } from "@prisma/client";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createShift, updateShift } from "@/components/feature/admin-events/shift-actions";

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  THEKE: "Theke",
  KASSE: "Kasse",
  LEIHE: "Leihe",
};

export type EditableShift = {
  id: string;
  type: ShiftType;
  startsAt: string;
  endsAt: string;
  capacity: number;
};

function toDateTimeLocal(iso: string) {
  return iso.slice(0, 16);
}

export function ShiftDialog({
  eventId,
  shift,
}: {
  eventId: string;
  shift?: EditableShift;
}) {
  const router = useRouter();
  const isEdit = Boolean(shift);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ShiftType>(shift?.type ?? "THEKE");
  const [startsAt, setStartsAt] = useState(
    shift ? toDateTimeLocal(shift.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    shift ? toDateTimeLocal(shift.endsAt) : "",
  );
  const [capacity, setCapacity] = useState(String(shift?.capacity ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setType(shift?.type ?? "THEKE");
    setStartsAt(shift ? toDateTimeLocal(shift.startsAt) : "");
    setEndsAt(shift ? toDateTimeLocal(shift.endsAt) : "");
    setCapacity(String(shift?.capacity ?? 1));
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!startsAt || !endsAt) {
      setError("Bitte Start- und End-Zeitpunkt angeben.");
      return;
    }
    setIsSubmitting(true);
    const input = {
      type,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      capacity: Number(capacity),
    };
    const result = isEdit
      ? await updateShift(shift!.id, input)
      : await createShift(eventId, input);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    if (!isEdit) reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="size-4" />
              Bearbeiten
            </Button>
          ) : (
            <Button className="gap-1.5">
              <Plus className="size-4" />
              Schicht anlegen
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Schicht bearbeiten" : "Neue Schicht"}</DialogTitle>
          <DialogDescription>
            Theke, Kasse (Flohmarkt) oder Leihe — mit festem Zeitfenster und
            Kapazität.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift-type">Typ</Label>
          <select
            id="shift-type"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as ShiftType)}
          >
            {Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift-starts">Beginn</Label>
          <Input
            id="shift-starts"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift-ends">Ende</Label>
          <Input
            id="shift-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift-capacity">Kapazität</Label>
          <Input
            id="shift-capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            required
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !startsAt || !endsAt}
          >
            {isSubmitting ? "Speichere…" : isEdit ? "Speichern" : "Schicht anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { SHIFT_TYPE_LABELS };
