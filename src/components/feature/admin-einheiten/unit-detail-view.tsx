"use client";

import { useState } from "react";
import type { ShelfCategory } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import {
  SHELF_CATEGORY_LABELS,
  SHELF_CATEGORY_VALUES,
} from "@/lib/ludothek/shelf-category";
import { useAction } from "@/components/ui/use-action";
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
import {
  AssignKeeperDialog,
  type KeeperOption,
} from "@/components/feature/admin-einheiten/assign-keeper-dialog";
import { PageContainer } from "@/components/ui/page-container";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import type { ProfilePictureVisibility } from "@prisma/client";

export type UnitDetail = {
  id: string;
  code: string;
  kind: "BOX" | "SHELF";
  label: string;
  locationNote: string | null;
  /** Feste Regal-Kategorie (#276), manuell vergeben — `null` bis gesetzt. */
  category: ShelfCategory | null;
  keeperMeepleId: string | null;
  keeperName: string | null;
  /** (#412) Verwahrer-Profilbild — Lagereinheiten-Verwaltung ist member-only,
   * Viewer ist daher immer "meeple". */
  keeperProfilePictureUrl: string | null;
  keeperProfilePictureVisibility: ProfilePictureVisibility;
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
  isAdmin,
  selfMeepleId,
  keeperOptions,
}: {
  unit: UnitDetail;
  contents: UnitContentRow[];
  moves: UnitMoveRow[];
  isAdmin: boolean;
  selfMeepleId: string;
  keeperOptions: KeeperOption[];
}) {
  const [label, setLabel] = useState(unit.label);
  const [locationNote, setLocationNote] = useState(unit.locationNote ?? "");
  const [category, setCategory] = useState<ShelfCategory | "">(
    unit.category ?? "",
  );
  const save = useAction({ refresh: false });
  const retire = useAction();

  function handleSave() {
    save.run(() =>
      updateStorageUnit(unit.id, {
        label,
        locationNote: locationNote || undefined,
        category: category || null,
      }),
    );
  }

  function handleRetire() {
    retire.run(() => retireStorageUnit(unit.id));
  }

  const error = save.error ?? retire.error;

  return (
    <PageContainer className="gap-6">
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
              disabled={unit.retired || !isAdmin}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-location">Ortsangabe</Label>
            <Input
              id="unit-location"
              value={locationNote}
              onChange={(event) => setLocationNote(event.target.value)}
              placeholder="z. B. Keller links"
              disabled={unit.retired || !isAdmin}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-category">Regal-Kategorie</Label>
            <select
              id="unit-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ShelfCategory | "")
              }
              disabled={unit.retired || !isAdmin}
              className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-60"
            >
              <option value="">Keine</option>
              {SHELF_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {SHELF_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              Verwahrer:{" "}
              {unit.keeperName ? (
                <MeepleAvatar
                  name={unit.keeperName}
                  profilePictureUrl={unit.keeperProfilePictureUrl}
                  profilePictureVisibility={unit.keeperProfilePictureVisibility}
                  viewer={{ kind: "meeple" }}
                  size="sm"
                />
              ) : null}
              {unit.keeperName ?? "keiner"}
            </p>
            {!unit.retired && (
              <AssignKeeperDialog
                unitId={unit.id}
                currentKeeperId={unit.keeperMeepleId}
                currentKeeperName={unit.keeperName}
                isAdmin={isAdmin}
                keeperOptions={keeperOptions}
                selfMeepleId={selfMeepleId}
              />
            )}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={save.pending || unit.retired}
              >
                {save.pending ? "Speichere…" : "Speichern"}
              </Button>
              {!unit.retired && (
                <Button
                  variant="outline"
                  onClick={handleRetire}
                  disabled={retire.pending}
                >
                  Stilllegen
                </Button>
              )}
            </div>
          )}
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
    </PageContainer>
  );
}
