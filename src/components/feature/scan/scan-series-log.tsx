"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { spieleCount, type CopyChoice } from "@/lib/ludothek/scanner-modes";
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

/** Gescannte Einheit, deren Spiele gesammelt gebucht werden können. */
export type UnitBulkPrompt = { label: string; count: number };

/**
 * Rückfrage „Alle Spiele <verb>?" nach dem Scan einer Einheit (Erhalten,
 * Kontrolle anfordern). Betrifft nur die Spiele direkt in der Einheit, nicht
 * die in Unterkisten. `onConfirm` bucht und loggt selbst; Fehler einzelner
 * Spiele landen im Log, der Dialog schließt danach in jedem Fall.
 */
export function UnitBulkDialog({
  unit,
  verb,
  onConfirm,
  onClose,
}: {
  unit: UnitBulkPrompt | null;
  verb: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <ActionDialog
      open={unit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Alle Spiele ${verb}?`}
      description={
        unit &&
        `${spieleCount(unit.count)} direkt in ${unit.label}. Spiele in Unterkisten bleiben unverändert.`
      }
      submitLabel={`Alle ${verb}`}
      pendingLabel="Buche …"
      action={async () => {
        await onConfirm();
        return {};
      }}
    />
  );
}

/**
 * Gemeinsame Hülle der Scan-Logs (#574): eine Card pro Modus, neueste
 * Einträge oben. `children` sind die `<li>`-Zeilen.
 */
export function ScanLogCard({
  title,
  emptyHint,
  isEmpty,
  children,
}: {
  title: string;
  emptyHint: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {isEmpty ? (
        <p className="text-muted-foreground text-sm">{emptyHint}</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">{children}</ul>
      )}
    </Card>
  );
}

/**
 * Rahmen eines Serienmodus: oben eine Card mit den Bedienelementen des Modus
 * (`children`), der Exemplar-Auswahl (falls nötig), der laufenden Buchung und
 * dem Zähler. Darunter das persistente Log. Einträge sind nicht erneut
 * auslösbar, ein Klick würde die Buchung wiederholen. Korrigiert wird über den
 * Link aufs Exemplar per Gegenbuchung.
 */
export function ScanSeriesLog({
  series,
  countLabel,
  emptyHint,
  children,
}: {
  series: ScanSeries;
  countLabel: (count: number) => string;
  emptyHint: string;
  children?: ReactNode;
}) {
  const { entries, count, choice, pick, cancelChoice, pending, error } = series;

  return (
    <>
      <Card className="gap-3">
        {children}
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
      </Card>

      <ScanLogCard
        title="Verlauf"
        emptyHint={emptyHint}
        isEmpty={entries.length === 0}
      >
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
      </ScanLogCard>
    </>
  );
}
