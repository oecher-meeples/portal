"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BoardGameKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  formatMechanics,
  formatCommaSeparatedList,
} from "@/lib/ludothek/bgg-id";
import { LANGUAGE_DEPENDENCE_LABELS } from "@/lib/ludothek/language-dependence";
import type { BggGameData } from "@/lib/bgg/client";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";
import type { BoardGameCompareField } from "@/lib/ludothek/board-game-bgg-compare";

const KIND_LABELS: Record<BoardGameKind, string> = {
  [BoardGameKind.BOARDGAME]: "Basisspiel",
  [BoardGameKind.BOARDGAME_EXPANSION]: "Erweiterung",
};

type DiffRow = {
  field: BoardGameCompareField;
  label: string;
  oldValue: string;
  newValue: string;
  apply: () => void;
};

/**
 * Rechte Spalte des "Daten mit BGG abgleichen"-Modus (#189) — statt einer
 * Spiegel-Liste aller vergleichbaren Felder zeigt sie nur, was tatsächlich
 * abweicht (`compareStatus`), je Zeile `alter Wert ← / → neuer Wert`. Klick
 * auf eine Seite übernimmt diesen Wert sofort ins Formular und lässt die
 * Zeile verschwinden — "alten Wert behalten" braucht keinen Formular-Patch,
 * zählt aber genauso als erledigt (`resolvedFields`), sonst taucht die Zeile
 * wieder auf. Kein Sammel-"Übernehmen" nötig, da jede Zeile für sich sofort
 * wirkt — "Fertig" schließt den Abgleich nur noch.
 */
export function BggComparePanel({
  bggData,
  form,
  compareStatus,
  onChange,
  onDone,
}: {
  bggData: BggGameData;
  form: BoardGameFormValues;
  compareStatus: Record<BoardGameCompareField, boolean>;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  onDone: () => void;
}) {
  const [resolvedFields, setResolvedFields] = useState<
    Set<BoardGameCompareField>
  >(new Set());

  const allRows: DiffRow[] = [
    {
      field: "title",
      label: "Titel",
      oldValue: form.title || "—",
      newValue: bggData.title,
      apply: () => onChange({ title: bggData.title }),
    },
    {
      field: "kind",
      label: "Art",
      oldValue: KIND_LABELS[form.kind],
      newValue: KIND_LABELS[bggData.kind],
      apply: () => onChange({ kind: bggData.kind }),
    },
    {
      field: "minPlayers",
      label: "Spieler von",
      oldValue: form.minPlayers || "—",
      newValue: bggData.minPlayers?.toString() ?? "—",
      apply: () =>
        onChange({ minPlayers: bggData.minPlayers?.toString() ?? "" }),
    },
    {
      field: "maxPlayers",
      label: "Spieler bis",
      oldValue: form.maxPlayers || "—",
      newValue: bggData.maxPlayers?.toString() ?? "—",
      apply: () =>
        onChange({ maxPlayers: bggData.maxPlayers?.toString() ?? "" }),
    },
    {
      field: "playTimeMinutes",
      label: "Spieldauer (Min.)",
      oldValue: form.playTimeMinutes || "—",
      newValue: bggData.playTimeMinutes?.toString() ?? "—",
      apply: () =>
        onChange({
          playTimeMinutes: bggData.playTimeMinutes?.toString() ?? "",
        }),
    },
    {
      field: "weight",
      label: "Komplexität (1–5)",
      oldValue: form.weight || "—",
      newValue: bggData.weight?.toString() ?? "—",
      apply: () => onChange({ weight: bggData.weight?.toString() ?? "" }),
    },
    {
      field: "averageRating",
      label: "Durchschnittliche Bewertung (0–10)",
      oldValue: form.averageRating || "—",
      newValue: bggData.averageRating?.toString() ?? "—",
      apply: () =>
        onChange({ averageRating: bggData.averageRating?.toString() ?? "" }),
    },
    {
      field: "imageUrl",
      label: "Bild-URL",
      oldValue: form.imageUrl || "—",
      newValue: bggData.imageUrl ?? "—",
      apply: () => onChange({ imageUrl: bggData.imageUrl ?? "" }),
    },
    {
      field: "mechanics",
      label: "Mechaniken",
      oldValue: form.mechanics || "—",
      newValue: bggData.mechanics.join(", ") || "—",
      apply: () => onChange({ mechanics: formatMechanics(bggData.mechanics) }),
    },
    {
      field: "categories",
      label: "Kategorien",
      oldValue: form.categories || "—",
      newValue: bggData.categories.join(", ") || "—",
      apply: () =>
        onChange({ categories: formatCommaSeparatedList(bggData.categories) }),
    },
    {
      field: "description",
      label: "Beschreibung",
      oldValue: form.description || "—",
      newValue: bggData.description ?? "—",
      apply: () => onChange({ description: bggData.description ?? "" }),
    },
    {
      field: "languageDependence",
      label: "Sprachabhängigkeit",
      oldValue: form.languageDependence
        ? LANGUAGE_DEPENDENCE_LABELS[form.languageDependence]
        : "—",
      newValue: bggData.languageDependence
        ? LANGUAGE_DEPENDENCE_LABELS[bggData.languageDependence]
        : "—",
      apply: () => onChange({ languageDependence: bggData.languageDependence }),
    },
  ];

  const rows = allRows.filter(
    (row) => !compareStatus[row.field] && !resolvedFields.has(row.field),
  );

  function resolve(field: BoardGameCompareField) {
    setResolvedFields((prev) => new Set(prev).add(field));
  }

  function keepOld(field: BoardGameCompareField) {
    resolve(field);
  }

  function applyNew(row: DiffRow) {
    row.apply();
    resolve(row.field);
  }

  return (
    <div className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Abweichungen zu BGG</p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Keine Abweichungen mehr.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.field} className="flex flex-col gap-1 text-sm">
              <p className="text-muted-foreground text-xs">{row.label}</p>
              <div className="flex items-stretch gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${row.label}: bisherigen Wert behalten`}
                  onClick={() => keepOld(row.field)}
                  className="h-auto flex-1 justify-start gap-1.5 py-1.5 text-left break-words whitespace-normal"
                >
                  <ArrowLeft className="size-4 shrink-0" />
                  {row.oldValue}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${row.label}: BGG-Wert übernehmen`}
                  onClick={() => applyNew(row)}
                  className="h-auto flex-1 justify-end gap-1.5 py-1.5 text-right break-words whitespace-normal"
                >
                  {row.newValue}
                  <ArrowRight className="size-4 shrink-0" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDone}
        className="self-end"
      >
        Fertig
      </Button>
    </div>
  );
}
