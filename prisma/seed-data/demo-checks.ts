import type { GameCopyCheckResult } from "@prisma/client";
import { stableFloat, stableIndex } from "./stable-random";

/**
 * Demo-Kontrollen (#599): ca. 40 Kontrollen über die letzten 12 Monate,
 * deterministisch über `stable-random.ts`. Das erste Exemplar bekommt
 * 7 Kontrollen (mehr als die 5 sichtbaren der Kontroll-Historie), das zweite
 * endet mit „Nicht spielbar" (→ `MAINTENANCE`), dazwischen gelegentliche
 * Mängel. Rein und ohne DB, damit die Verteilung testbar ist.
 */

export const DEMO_CHECK_COPY_COUNT = 16;
const MAX_DAYS_AGO = 360;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFECT_NOTES: Record<
  Exclude<GameCopyCheckResult, "COMPLETE">,
  string[]
> = {
  INCOMPLETE: [
    "Unvollständig spielbar: 1 Goldmünze fehlt",
    "Unvollständig spielbar: 2 Holzwürfel fehlen",
    "Unvollständig spielbar: Startspielermarker fehlt",
  ],
  DAMAGED: [
    "Beschädigt: Schachtelecke eingerissen",
    "Beschädigt: Spielplan geknickt",
  ],
  UNPLAYABLE: ["Nicht spielbar: Regelheft und Kartendeck fehlen"],
};
const COMPLETE_NOTES = [null, null, "Neuwertig", "Leichte Gebrauchsspuren"];

export type DemoCheck = {
  gameCopyId: string;
  checkedAt: Date;
  result: GameCopyCheckResult;
  note: string | null;
};

function pick<T>(key: string, pool: T[]): T {
  return pool[stableIndex(key, pool.length)];
}

function resultFor(key: string): GameCopyCheckResult {
  const roll = stableFloat(key);
  if (roll < 0.15) return "INCOMPLETE";
  if (roll < 0.25) return "DAMAGED";
  return "COMPLETE";
}

function noteFor(key: string, result: GameCopyCheckResult) {
  return result === "COMPLETE"
    ? pick(`${key}:note`, COMPLETE_NOTES)
    : pick(`${key}:note`, DEFECT_NOTES[result]);
}

/** Kontrollen je Exemplar, älteste zuerst; `gameCopyIds` in stabiler Reihenfolge. */
export function planDemoChecks(gameCopyIds: string[], now: Date): DemoCheck[] {
  return gameCopyIds
    .slice(0, DEMO_CHECK_COPY_COUNT)
    .flatMap((gameCopyId, copyIndex) => {
      const count = copyIndex === 0 ? 7 : 1 + stableIndex(`${gameCopyId}:n`, 3);
      // Zeitpunkte gleichmäßig über das Jahr gestreut, je Exemplar versetzt.
      const days = Array.from({ length: count }, (_, i) => {
        const jitter = stableFloat(`${gameCopyId}:day:${i}`);
        return Math.floor(((i + jitter) / count) * MAX_DAYS_AGO);
      }).sort((a, b) => b - a);

      return days.map((daysAgo, i) => {
        const key = `${gameCopyId}:check:${i}`;
        const isLatest = i === days.length - 1;
        const result: GameCopyCheckResult =
          copyIndex === 1 && isLatest ? "UNPLAYABLE" : resultFor(key);
        return {
          gameCopyId,
          // Uhrzeit 10–18 Uhr, damit kein Demo-Datum knapp an einer
          // Monatsgrenze kippt.
          checkedAt: new Date(
            now.getTime() -
              daysAgo * DAY_MS -
              (6 + stableIndex(`${key}:h`, 8)) * 60 * 60 * 1000,
          ),
          result,
          note: noteFor(key, result),
        };
      });
    });
}
