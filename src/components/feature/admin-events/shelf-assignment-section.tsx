"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import {
  assignShelfToEvent,
  unassignShelfFromEvent,
} from "@/components/feature/admin-events/shelf-assignment-actions";

export type ShelfOption = {
  id: string;
  label: string;
};

export function ShelfAssignmentSection({
  eventId,
  assignedShelves,
  availableShelves,
}: {
  eventId: string;
  assignedShelves: ShelfOption[];
  availableShelves: ShelfOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUnitId, setSelectedUnitId] = useState(
    availableShelves[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  function handleAssign() {
    if (!selectedUnitId) return;
    startTransition(async () => {
      setError(null);
      const result = await assignShelfToEvent(eventId, selectedUnitId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUnassign(unitId: string) {
    startTransition(async () => {
      setError(null);
      await unassignShelfFromEvent(eventId, unitId);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regal-Zuordnung</CardTitle>
        <CardDescription>
          Welche Regale sind bei diesem Event aufgebaut? Rein informativ für den
          Gäste-Bereich.
        </CardDescription>
      </CardHeader>

      {assignedShelves.length > 0 && (
        <ul className="flex flex-col divide-y text-sm">
          {assignedShelves.map((shelf) => (
            <li
              key={shelf.id}
              className="flex items-center justify-between py-2"
            >
              <span>{shelf.label}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => handleUnassign(shelf.id)}
                aria-label="Zuordnung entfernen"
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {availableShelves.length > 0 && (
        <div className="flex items-center gap-2">
          <NativeSelect
            value={selectedUnitId}
            onChange={(event) => setSelectedUnitId(event.target.value)}
            size="md"
            className="flex-1"
          >
            {availableShelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.label}
              </option>
            ))}
          </NativeSelect>
          <Button size="sm" disabled={isPending} onClick={handleAssign}>
            Zuordnen
          </Button>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </Card>
  );
}
