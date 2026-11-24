/**
 * Reichert den Release-Bestand (#603) mit BGG-Daten an — einmalige
 * Datenpflege, der Seed selbst ruft BGG nie auf.
 *
 * 1. Zuordnung: Zeilen in `release-inventory.csv` ohne `bggMatch` werden per
 *    exakter BGG-Titelsuche zugeordnet (`exact` = eindeutig, `picked` = aus
 *    mehreren Treffern gewählt — prüfen!, `none` = kein Treffer). Bei
 *    mehreren Treffern werden die besten Kandidaten geladen und bewertet:
 *    deutsche Edition (Sprache oder deutscher Verlag) vor passendem Namen
 *    vor Basisspiel/Erweiterung (`scoreCandidate`).
 *    Von Hand eingetragene `bggId`s ohne `bggMatch` werden als `manual`
 *    markiert und nie überschrieben.
 * 2. Abruf: für jede `bggId` ohne Eintrag in `release-board-games.json`
 *    die Titeldaten wie beim regulären BGG-Import (`bggDataToTitleInput`)
 *    samt deutscher Edition (`pickGermanVersion`).
 *
 * 3. Mit `--fuzzy`: Zeilen mit `none` per unscharfer Suche erneut zuordnen —
 *    nur Kandidaten, die den Vereinstitel nach Normalisierung (ohne
 *    Satzzeichen/Artikel) als Namen tragen, Ergebnis `fuzzy`.
 *
 * 4. Mit `--repick`: `picked`/`fuzzy`-Zuordnungen neu bewerten (nach einer
 *    Änderung der Bewertungsregel). Von Hand gesetzte bleiben unberührt.
 *
 * Fortsetzbar: beide Dateien werden laufend gespeichert, ein erneuter
 * Aufruf macht dort weiter, wo der letzte aufgehört hat.
 *
 * Aufruf:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/enrich-release-inventory-bgg.ts [--fuzzy] [--repick]
 */
import fs from "node:fs";
import path from "node:path";
import { sleep } from "../src/lib/utils/sleep";
import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  searchBggGames,
  searchBggGamesExact,
  type BggGameData,
  type BggSearchResult,
} from "../src/lib/bgg/client";
import {
  parseReleaseInventory,
  serializeReleaseInventory,
  type ReleaseInventoryRow,
} from "../prisma/seed-data/release-inventory";
import {
  bggNameFor,
  pickBestCandidate,
  RELEASE_BOARD_GAMES_FILE,
  readReleaseBoardGames,
  scoreCandidate,
  toReleaseBoardGame,
  writeReleaseBoardGames,
  type ReleaseBoardGames,
} from "../prisma/seed-data/release-board-games";
import {
  BGG_SCRIPT_THROTTLE_MS as THROTTLE_MS,
  withRateLimitRetry,
} from "./lib/bgg-rate-limit";

const CSV = path.join(__dirname, "../prisma/seed-data/release-inventory.csv");
const BOARD_GAMES = path.join(__dirname, "..", RELEASE_BOARD_GAMES_FILE);
const SAVE_EVERY = 10;
/** So viele Kandidaten einer mehrdeutigen Suche werden geladen und bewertet. */
const MAX_CANDIDATES = 5;

async function fetchGame(bggId: number): Promise<BggGameData | null> {
  try {
    const data = await withRateLimitRetry(() => fetchBggGame(bggId));
    await sleep(THROTTLE_MS);
    return data;
  } catch (error) {
    if (error instanceof BggNotFoundError || error instanceof BggApiError) {
      console.warn(`  ${bggId}: ${error.message}`);
      return null;
    }
    throw error;
  }
}

/** Mehrere Treffer: Kandidaten laden, bewerten, den besten nehmen
 * (`pickBestCandidate`). `requireName` (unscharfe
 * Suche) lässt nur Kandidaten zu, die den Titel nach Normalisierung als
 * Haupt- oder Alternativnamen tragen. */
async function resolveCandidates(
  title: string,
  candidates: BggSearchResult[],
  { requireName = false } = {},
) {
  const scored: { bggId: number; data: BggGameData; score: number }[] = [];
  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    const data = await fetchGame(candidate.bggId);
    if (data && (!requireName || bggNameFor(title, data))) {
      scored.push({
        bggId: candidate.bggId,
        data,
        score: scoreCandidate(title, data),
      });
    }
  }
  return pickBestCandidate(scored) ?? null;
}

async function matchRows(
  games: ReleaseBoardGames,
  { fuzzy, repick }: { fuzzy: boolean; repick: boolean },
) {
  const rows = parseReleaseInventory(fs.readFileSync(CSV, "utf-8"));
  const save = () => {
    fs.writeFileSync(CSV, serializeReleaseInventory(rows));
    writeReleaseBoardGames(BOARD_GAMES, games);
  };

  for (const row of rows) {
    if (row.bggId && !row.bggMatch) row.bggMatch = "manual";
    // `picked` ohne geladene Daten stammt aus einem abgebrochenen bzw.
    // älteren Lauf — neu bewerten.
    const stale = !row.bggId || !games[row.bggId];
    const reevaluate =
      repick && (row.bggMatch === "picked" || row.bggMatch === "fuzzy");
    if ((row.bggMatch === "picked" && stale) || reevaluate) {
      row.bggMatch = null;
      row.bggId = null;
    }
  }
  const open = (r: ReleaseInventoryRow) =>
    !r.bggMatch || (fuzzy && r.bggMatch === "none");
  const titles = [...new Set(rows.filter(open).map((r) => r.title))];
  console.log(
    `Zuordnung${fuzzy ? " (unscharf)" : ""}: ${titles.length} Titel werden gesucht …`,
  );

  for (const [index, title] of titles.entries()) {
    const candidates = await withRateLimitRetry(() =>
      fuzzy ? searchBggGames(title) : searchBggGamesExact(title),
    );
    await sleep(THROTTLE_MS);
    let match: ReleaseInventoryRow["bggMatch"] = "none";
    let bggId: number | null = null;
    if (!fuzzy && candidates.length === 1) {
      match = "exact";
      bggId = candidates[0].bggId;
    } else if (candidates.length > 0) {
      const best = await resolveCandidates(title, candidates, {
        requireName: fuzzy,
      });
      if (best) {
        match = fuzzy ? "fuzzy" : "picked";
        bggId = best.bggId;
        games[best.bggId] ??= toReleaseBoardGame(best.bggId, best.data, title);
      }
    }
    for (const row of rows) {
      if (row.title === title && open(row)) {
        row.bggId = bggId;
        row.bggMatch = match;
      }
    }
    const name = bggId && games[bggId] ? ` (${games[bggId].input.title})` : "";
    console.log(
      `[${index + 1}/${titles.length}] ${title} → ${match}${bggId ? ` ${bggId}${name}` : ""}`,
    );
    if ((index + 1) % SAVE_EVERY === 0) save();
  }
  save();
  return rows;
}

async function fetchGames(
  rows: ReleaseInventoryRow[],
  games: ReleaseBoardGames,
) {
  const titleById = new Map<number, string>();
  for (const row of rows) {
    if (row.bggId && !titleById.has(row.bggId))
      titleById.set(row.bggId, row.title);
  }
  const pending = [...titleById].filter(([id]) => !games[id]);
  console.log(`
Abruf: ${pending.length} BGG-Titel werden geladen …`);

  for (const [index, [bggId, title]] of pending.entries()) {
    const data = await fetchGame(bggId);
    if (data) {
      games[bggId] = toReleaseBoardGame(bggId, data, title);
      console.log(
        `[${index + 1}/${pending.length}] ${bggId} ${data.title} — Edition: ${games[bggId].versionPick}`,
      );
    }
    if ((index + 1) % SAVE_EVERY === 0)
      writeReleaseBoardGames(BOARD_GAMES, games);
  }
  writeReleaseBoardGames(BOARD_GAMES, games);
}

async function main() {
  const games = readReleaseBoardGames(BOARD_GAMES);
  const rows = await matchRows(games, {
    fuzzy: process.argv.includes("--fuzzy"),
    repick: process.argv.includes("--repick"),
  });
  await fetchGames(rows, games);

  // Datensätze verworfener Kandidaten (z. B. nach `--repick`) entfernen.
  const used = new Set(rows.flatMap((r) => (r.bggId ? [r.bggId] : [])));
  for (const id of Object.keys(games).map(Number)) {
    if (!used.has(id)) delete games[id];
  }
  writeReleaseBoardGames(BOARD_GAMES, games);

  const count = <T>(values: T[]) =>
    Object.entries(Object.groupBy(values, (v) => String(v ?? "offen")))
      .map(([k, v]) => `${k} ${v?.length}`)
      .join(", ");
  console.log(`
Zuordnung: ${count(rows.map((r) => r.bggMatch))}`);
  console.log(
    `Editionen: ${count(Object.values(games).map((g) => g.versionPick))}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
