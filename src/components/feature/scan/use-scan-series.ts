"use client";

import { useRef, useState } from "react";
import { useAction } from "@/components/ui/use-action";
import { useScanLog } from "@/components/feature/scan/use-scan-log";
import {
  SERIES_SCAN_LOG_POLICY,
  type ScanLogEntry,
} from "@/lib/ludothek/scan-log";
import { scanResolveCode } from "@/lib/ludothek/holding-actions";
import { scanPickCopy } from "@/lib/ludothek/scanner-actions";
import type { ResolvedScan } from "@/lib/ludothek/holdings";
import type {
  ScannerMode,
  ScannerTarget,
} from "@/lib/ludothek/scanner-dispatch";
import { toCopyChoices, type CopyChoice } from "@/lib/ludothek/scanner-modes";
import { copyDetailPath, formatShortIdSlug } from "@/lib/short-id/short-id";

/** Was die Scanner-Seite an den aktiven Modus weiterreicht (Kamera + manuelle Eingabe). */
export type ScanModeHandle = { handleCode: (raw: string) => Promise<void> };

export type SeriesTone = "success" | "info" | "error";

export type SeriesBooking = {
  tone: SeriesTone;
  text: string;
  /** Link aufs Exemplar — korrigiert wird dort per Gegenbuchung (kein Undo). */
  href?: string;
  /** Beitrag zum Serien-Zähler („N Spiele erhalten"), Standard 0. */
  counts?: number;
};

/** Persistiert pro Modus (#574) — `key`/`at` vergibt `useScanLog`. */
export type SeriesEntry = SeriesBooking & ScanLogEntry;

/** Gleicher Code innerhalb dieser Zeit → kein zweiter Buchungsversuch. */
export const SCAN_DEBOUNCE_MS = 3000;

/** `Ark Nova (inv-189)` — die Short-ID wie auf dem Etikett (#574). */
export function gameLabel(game: CopyChoice) {
  return game.inventoryNumber
    ? `${game.title} (${formatShortIdSlug({ kind: "inv", id: game.inventoryNumber })})`
    : game.title;
}

/** Log-Eintrag zu einem Exemplar: „Titel (inv-n) – label" mit Link aufs Exemplar. */
export function gameBooking(
  game: CopyChoice,
  label: string,
  rest: Omit<SeriesBooking, "text" | "href">,
): SeriesBooking {
  return {
    ...rest,
    text: `${gameLabel(game)} – ${label}`,
    href:
      game.inventoryNumber !== null
        ? copyDetailPath(game.boardGameSlug, game.inventoryNumber)
        : undefined,
  };
}

/** Unbekannter Code: ein nicht angelegtes Einheiten-Etikett heißt so, statt
 * wie ein fehlendes Spiel „Nicht im Bestand" zu melden. */
export function unknownScanText(
  resolved: Extract<ResolvedScan, { kind: "unknown" }>,
): string {
  return resolved.unitCode
    ? `Einheit ${resolved.unitCode} ist nicht angelegt.`
    : `Nicht im Bestand: ${resolved.raw}`;
}

/** Baut den Log-Eintrag aus einem Action-Ergebnis (`{ error }` oder Erfolg). */
export function resultBooking<V>(
  game: CopyChoice,
  result: { error?: string; value?: V },
  describe: (value: V) => Omit<SeriesBooking, "text" | "href"> & {
    label: string;
  },
): SeriesBooking {
  if (result.error || result.value === undefined) {
    return { tone: "error", text: `${gameLabel(game)} – ${result.error}` };
  }
  const { label, ...rest } = describe(result.value);
  return gameBooking(game, label, rest);
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
  /** Bucht (bzw. öffnet) ein Exemplar; `null` = nichts ins Log. */
  book: (game: CopyChoice) => Promise<SeriesBooking | null>;
  /** Einheit, Meeple-QR oder unbekannter Code — Hinweis fürs Log oder `null`. */
  onOtherScan: (
    resolved: Exclude<ResolvedScan, { kind: "games" }>,
  ) => SeriesBooking | null | Promise<SeriesBooking | null>;
}) {
  const { entries, add } = useScanLog<SeriesEntry>(
    mode,
    SERIES_SCAN_LOG_POLICY,
  );
  // Der Zähler gilt für die laufende Serie, nicht für das gespeicherte Log.
  const [count, setCount] = useState(0);
  const [choice, setChoice] = useState<CopyChoice[] | null>(null);
  const { run, pending, error } = useAction();
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ raw: string; at: number } | null>(null);

  function log(booking: SeriesBooking) {
    add(booking);
    setCount((current) => current + (booking.counts ?? 0));
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
    const booking = await book(game);
    if (booking) log(booking);
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
        const hint = await onOtherScan(resolved);
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

  /** Alle Spiele einer gescannten Einheit nacheinander buchen — jedes
   * bekommt seinen eigenen Log-Eintrag, ein Fehler stoppt die übrigen nicht. */
  async function bookAll(games: CopyChoice[]) {
    setChoice(null);
    await exclusive(async () => {
      for (const game of games) await bookAndLog(game);
    });
  }

  return {
    handleCode,
    entries,
    count,
    log,
    choice,
    pick,
    bookAll,
    cancelChoice: () => setChoice(null),
    pending,
    error,
  };
}

export type ScanSeries = ReturnType<typeof useScanSeries>;
