"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  retireStorageUnit,
  updateStorageUnit,
} from "@/components/feature/admin-einheiten/actions";

export type UnitDetail = {
  id: string;
  code: string;
  kind: "BOX" | "SHELF";
  label: string;
  locationNote: string | null;
  keeperName: string | null;
  retired: boolean;
};

export type UnitContentRow = {
  id: string;
  title: string;
  slug: string;
};

export type UnitMoveRow = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  keeperName: string | null;
  locationNote: string | null;
  recordedByName: string;
};

export function UnitDetailView({
  unit,
  contents,
  moves,
}: {
  unit: UnitDetail;
  contents: UnitContentRow[];
  moves: UnitMoveRow[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState(unit.label);
  const [locationNote, setLocationNote] = useState(unit.locationNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    const result = await updateStorageUnit(unit.id, {
      label,
      locationNote: locationNote || undefined,
    });
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRetire() {
    setIsSaving(true);
    setError(null);
    const result = await retireStorageUnit(unit.id);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={unit.kind === "BOX" ? "Karton" : "Regal"}
        title={unit.code}
        description={unit.retired ? "Stillgelegt" : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-label">Label</Label>
            <Input
              id="unit-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              disabled={unit.retired}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-location">Ortsangabe</Label>
            <Input
              id="unit-location"
              value={locationNote}
              onChange={(event) => setLocationNote(event.target.value)}
              placeholder="z. B. Keller links"
              disabled={unit.retired}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Verwahrer: {unit.keeperName ?? "keiner"}
          </p>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving || unit.retired}>
              {isSaving ? "Speichere…" : "Speichern"}
            </Button>
            {!unit.retired && (
              <Button
                variant="outline"
                onClick={handleRetire}
                disabled={isSaving}
              >
                Stilllegen
              </Button>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h2 className="font-serif text-lg font-bold">
            Inhalt ({contents.length})
          </h2>
          {contents.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">Leer.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y text-sm">
              {contents.map((game) => (
                <li key={game.id} className="py-2">
                  {game.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Von</TableHead>
              <TableHead>Bis</TableHead>
              <TableHead>Verwahrer</TableHead>
              <TableHead>Ortsangabe</TableHead>
              <TableHead>Erfasst von</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moves.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground text-center"
                >
                  Noch keine Bewegungshistorie.
                </TableCell>
              </TableRow>
            ) : (
              moves.map((move) => (
                <TableRow key={move.id}>
                  <TableCell>{move.startedAt}</TableCell>
                  <TableCell>{move.endedAt ?? "aktuell"}</TableCell>
                  <TableCell>{move.keeperName ?? "—"}</TableCell>
                  <TableCell>{move.locationNote ?? "—"}</TableCell>
                  <TableCell>{move.recordedByName}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
