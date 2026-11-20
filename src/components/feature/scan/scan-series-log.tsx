"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { CopyChoice } from "@/lib/ludothek/scanner-modes";
import type {
  ScanSeries,
  SeriesTone,
} from "@/components/feature/scan/use-scan-series";

const TONE_CLASSES: Record<SeriesTone, string> = {
  success: "text-emerald-700 dark:text-emerald-400",
  info: "text-muted-foreground",
  error: "text-destructive",
};

/** Exemplar-Auswahl bei mehrdeutiger EAN — Einzel-Scan und Serien teilen sie. */
export function CopyChoiceList({
  games,
  onPick,
  onCancel,
}: {
  games: CopyChoice[];
  onPick: (game: CopyChoice) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        Mehrere Spiele mit dieser EAN — welches?
      </p>
      <div className="flex flex-col gap-1">
        {games.map((game) => (
          <button
            key={game.id}
            type="button"
            className="hover:bg-muted cursor-pointer rounded-md border px-3 py-2 text-left text-sm"
            onClick={() => onPick(game)}
          >
            {game.title}
            {game.inventoryNumber ? (
              <span className="text-muted-foreground">
                {" "}
                · Inv.-Nr. {game.inventoryNumber}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {onCancel && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={onCancel}
        >
          Abbrechen
        </Button>
      )}
    </div>
  );
}

/**
 * Serien-Log der Scanner-Modi: Exemplar-Auswahl (falls nötig), laufende
 * Buchung, Zähler und die Einträge — neueste oben, jeder mit Link aufs
 * Exemplar (Korrektur dort per Gegenbuchung, kein Rückgängig).
 */
export function ScanSeriesLog({
  series,
  countLabel,
  emptyHint,
}: {
  series: ScanSeries;
  countLabel: (count: number) => string;
  emptyHint: string;
}) {
  const { entries, count, choice, pick, cancelChoice, pending, error } = series;

  return (
    <div className="flex flex-col gap-3">
      {choice && (
        <CopyChoiceList
          games={choice}
          onPick={(game) => void pick(game)}
          onCancel={cancelChoice}
        />
      )}
      {pending && <p className="text-muted-foreground text-sm">Buche …</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <p className="text-sm font-medium" aria-live="polite">
        {countLabel(count)}
      </p>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyHint}</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {entries.map((entry) => (
            <li
              key={entry.key}
              className={cn(
                "flex flex-wrap items-baseline justify-between gap-x-3 py-1.5",
                TONE_CLASSES[entry.tone],
              )}
            >
              <span>{entry.text}</span>
              {entry.href && (
                <Link
                  href={entry.href}
                  className="text-primary shrink-0 text-xs hover:underline"
                >
                  Zum Exemplar →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
