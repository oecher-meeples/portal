"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { createStorageUnit } from "@/components/feature/admin-einheiten/actions";

export function CreateStorageUnitDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"BOX" | "SHELF">("BOX");
  const [label, setLabel] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setKind("BOX");
    setLabel("");
    setLocationNote("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const result = await createStorageUnit({
      kind,
      label,
      locationNote: locationNote || undefined,
    });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    reset();
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
          <Button className="gap-1.5">
            <Plus className="size-4" />
            Einheit anlegen
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Aufbewahrungseinheit</DialogTitle>
          <DialogDescription>
            Der Code (z. B. OM-BOX-0004) wird automatisch fortlaufend vergeben.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={kind === "BOX" ? "default" : "outline"}
            onClick={() => setKind("BOX")}
          >
            Karton
          </Button>
          <Button
            type="button"
            size="sm"
            variant={kind === "SHELF" ? "default" : "outline"}
            onClick={() => setKind("SHELF")}
          >
            Regal
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-label">Label</Label>
          <Input
            id="unit-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-location">Ortsangabe (optional)</Label>
          <Input
            id="unit-location"
            value={locationNote}
            onChange={(event) => setLocationNote(event.target.value)}
            placeholder="z. B. Keller links"
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !label.trim()}>
            {isSubmitting ? "Lege an…" : "Einheit anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
