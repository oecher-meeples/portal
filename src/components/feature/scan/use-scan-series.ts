"use client";

import { useRef, useState } from "react";
import { useAction } from "@/components/ui/use-action";
import { scanResolveCode } from "@/lib/ludothek/holding-actions";
import { scanPickCopy } from "@/lib/ludothek/scanner-actions";
import type { ResolvedScan } from "@/lib/ludothek/holdings";
import type {
  ScannerMode,
  ScannerOutcome,
  ScannerTarget,
} from "@/lib/ludothek/scanner-dispatch";
import { toCopyChoices, type CopyChoice } from "@/lib/ludothek/scanner-modes";
import { copyDetailPath } from "@/lib/short-id/short-id";

/** Was die Scanner-Seite an den aktiven Modus weiterreicht (Kamera + manuelle Eingabe). */
export type ScanModeHandle = { handleCode: (raw: string) => Promise<void> };

export type SeriesTone = "success" | "info" | "error";

export type SeriesBooking = {
  tone: SeriesTone;
  text: string;
  /** Link aufs Exemplar — korrigiert wird dort per Gegenbuchung (kein Undo). */
  href?: string;
  /** Zählt zum Serien-Zähler („N Spiele erhalten"). */
  counts?: boolean;
};

export type SeriesEntry = SeriesBooking & { key: number };

/** Gleicher Code innerhalb dieser Zeit → kein zweiter Buchungsversuch. */
export const SCAN_DEBOUNCE_MS = 3000;

export function gameLabel(game: CopyChoice) {
  return game.inventoryNumber
    ? `${game.title} (Inv.-Nr. ${game.inventoryNumber})`
    : game.title;
}

/** Baut den Log-Eintrag aus dem Ergebnis von `scanReceiveGame`/`scanTransferGame`. */
export function outcomeBooking<O extends ScannerOutcome>(
  game: CopyChoice,
  result: { error?: string; value?: O },
  describe: (outcome: O) => Omit<SeriesBooking, "text" | "href"> & {
    label: string;
  },
): SeriesBooking {
  if (result.error || !result.value) {
    return { tone: "error", text: `${gameLabel(game)}: ${result.error}` };
  }
  const outcome = result.value;
  const { label, ...rest } = describe(outcome);
  return {
    ...rest,
    text: `${gameLabel(game)}: ${label}`,
    href:
      outcome.inventoryNumber !== null
        ? copyDetailPath(outcome.boardGameSlug, outcome.inventoryNumber)
        : undefined,
  };
}

/**
 * Geteiltes Gerüst der Scanner-Serien (Erhalten, später Übergeben und die
 * Kontroll-Modi): Code auflösen, entprellen, während einer laufenden Buchung
 * neue Scans verwerfen, bei mehrdeutiger EAN vorauswählen (`scanPickCopy`)
 * und nur bei echter Mehrdeutigkeit die Exemplar-Auswahl zeigen.
 */
export function useScanSeries({
  mode,
  target = null,
  book,
  onOtherScan,
}: {
  mode: ScannerMode;
  target?: ScannerTarget | null;
  book: (game: CopyChoice) => Promise<SeriesBooking>;
  /** Einheit, Meeple-QR oder unbekannter Code — Hinweis fürs Log oder `null`. */
  onOtherScan: (
    resolved: Exclude<ResolvedScan, { kind: "games" }>,
  ) => SeriesBooking | null;
}) {
  const [entries, setEntries] = useState<SeriesEntry[]>([]);
  const [choice, setChoice] = useState<CopyChoice[] | null>(null);
  const { run, pending, error } = useAction();
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ raw: string; at: number } | null>(null);
  const nextKeyRef = useRef(0);

  function log(booking: SeriesBooking) {
    const key = nextKeyRef.current++;
    setEntries((current) => [{ ...booking, key }, ...current]);
  }

  async function exclusive(task: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await run(async () => {
        await task();
      });
    } finally {
      busyRef.current = false;
    }
  }

  async function bookAndLog(game: CopyChoice) {
    log(await book(game));
  }

  async function handleCode(raw: string) {
    const now = Date.now();
    const last = lastScanRef.current;
    if (busyRef.current) return;
    if (last && last.raw === raw && now - last.at < SCAN_DEBOUNCE_MS) return;
    lastScanRef.current = { raw, at: now };

    await exclusive(async () => {
      const resolved = await scanResolveCode(raw);
      if (resolved.kind !== "games") {
        const hint = onOtherScan(resolved);
        if (hint) log(hint);
        return;
      }
      const games = toCopyChoices(resolved.games);
      const pickedId =
        games.length === 1
          ? games[0].id
          : await scanPickCopy(
              games.map((game) => game.id),
              mode,
              target,
            );
      const picked = games.find((game) => game.id === pickedId);
      if (!picked) {
        setChoice(games);
        return;
      }
      setChoice(null);
      await bookAndLog(picked);
    });
  }

  async function pick(game: CopyChoice) {
    setChoice(null);
    await exclusive(() => bookAndLog(game));
  }

  return {
    handleCode,
    entries,
    count: entries.filter((entry) => entry.counts).length,
    choice,
    pick,
    cancelChoice: () => setChoice(null),
    pending,
    error,
  };
}

export type ScanSeries = ReturnType<typeof useScanSeries>;
