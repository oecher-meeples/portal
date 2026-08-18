"use client";

import { ArrowLeft } from "lucide-react";
import { BoardGameKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { formatMechanics } from "@/lib/ludothek/bgg-id";
import type { BggGameData } from "@/lib/bgg/client";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

const KIND_LABELS: Record<BoardGameKind, string> = {
  [BoardGameKind.BOARDGAME]: "Basisspiel",
  [BoardGameKind.BOARDGAME_EXPANSION]: "Erweiterung",
};

/**
 * Rechte Spalte des "Daten mit BGG abgleichen"-Modus (#189) — read-only
 * Anzeige der frisch geladenen BGG-Werte, je Feld ein "→"-Button, der den
 * Wert ins linke Formular übernimmt. Nur Felder mit 1:1-BGG-Entsprechung
 * (siehe `compareBoardGameWithBgg`); EAN/BGG-ID/Erklärvideo haben keine
 * Zeile hier — Erklärvideo hat bereits seine eigene Auswahl-UI (#185). `Art`
 * ist seit #202 dabei, BGGs `type`-Attribut ist zuverlässig.
 */
export function BggComparePanel({
  bggData,
  onChange,
}: {
  bggData: BggGameData;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
}) {
  const rows: { label: string; value: string; apply: () => void }[] = [
    {
      label: "Titel",
      value: bggData.title,
      apply: () => onChange({ title: bggData.title }),
    },
    {
      label: "Art",
      value: KIND_LABELS[bggData.kind],
      apply: () => onChange({ kind: bggData.kind }),
    },
    {
      label: "Spieler von",
      value: bggData.minPlayers?.toString() ?? "—",
      apply: () =>
        onChange({ minPlayers: bggData.minPlayers?.toString() ?? "" }),
    },
    {
      label: "Spieler bis",
      value: bggData.maxPlayers?.toString() ?? "—",
      apply: () =>
        onChange({ maxPlayers: bggData.maxPlayers?.toString() ?? "" }),
    },
    {
      label: "Spieldauer (Min.)",
      value: bggData.playTimeMinutes?.toString() ?? "—",
      apply: () =>
        onChange({
          playTimeMinutes: bggData.playTimeMinutes?.toString() ?? "",
        }),
    },
    {
      label: "Komplexität (1–5)",
      value: bggData.weight?.toString() ?? "—",
      apply: () => onChange({ weight: bggData.weight?.toString() ?? "" }),
    },
    {
      label: "Bild-URL",
      value: bggData.imageUrl ?? "—",
      apply: () => onChange({ imageUrl: bggData.imageUrl ?? "" }),
    },
    {
      label: "Mechaniken",
      value: bggData.mechanics.join(", ") || "—",
      apply: () => onChange({ mechanics: formatMechanics(bggData.mechanics) }),
    },
    {
      label: "Beschreibung",
      value: bggData.description ?? "—",
      apply: () => onChange({ description: bggData.description ?? "" }),
    },
  ];

  return (
    <div className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Aktuelle BGG-Daten</p>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-start justify-between gap-2 text-sm"
          >
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{row.label}</p>
              <p className="break-words whitespace-pre-wrap">{row.value}</p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={`${row.label} übernehmen`}
              onClick={row.apply}
              className="shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
