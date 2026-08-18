/**
 * Einmaliger Datenpflege-Lauf: gleicht bestehende `BoardGame`-Titel mit
 * BoardGameGeek ab und übernimmt alle BGG-Felder — die Demodaten wurden
 * ohne echten BGG-Abgleich angelegt und entsprechen nicht mehr dem
 * Qualitätsanspruch. Nutzt bewusst dieselben Bausteine wie der reguläre
 * BGG-Import (`fetchBggGame`, `searchBggGamesExact`, `translateToGerman`,
 * `translateMechanics`, `resolvePublisherFromVersions`) statt die
 * BGG-Mapping-Logik zu duplizieren.
 *
 * Läuft direkt gegen Prisma statt über `updateBoardGame()`/`createBoardGame()`
 * — die Server Actions verlangen eine eingeloggte Session
 * (`requireGamesManagePermission()`), die es in diesem Skript-Kontext nicht
 * gibt. Die Schreiblogik hier ist ein bewusst schmaler Ausschnitt aus
 * `toBoardGameTitleData()`.
 *
 * Optional nur eine Teilmenge abgleichen (z. B. ein Retry der Titel, die im
 * ersten Lauf an BGGs Rate-Limit gescheitert sind): Titel zeilenweise in eine
 * Datei schreiben und deren Pfad als erstes Argument übergeben.
 *
 * Aufruf:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/refresh-board-games-from-bgg.ts [titles-file]
 */
import fs from "node:fs";
import { prisma } from "../src/lib/utils/prisma";
import { sleep } from "../src/lib/utils/sleep";
import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  searchBggGamesExact,
  type BggGameData,
} from "../src/lib/bgg/client";
import { translateToGerman } from "../src/lib/bgg/translate";
import { translateMechanics } from "../src/lib/ludothek/mechanics-translations";
import { resolvePublisherFromVersions } from "../src/lib/ludothek/board-game-versions";

// BGGs tatsächliches Rate-Limit ist strenger als die im Massenimport (#186)
// dokumentierten "2 Anfragen/Sekunde" — ein erster Lauf mit 600ms brach nach
// ca. 30 Titeln in eine Serie von 429ern ein. Deutlich konservativer, dafür
// mit Backoff-Retry statt einem harten Fail bei einem gelegentlichen 429.
const THROTTLE_MS = 4000;
const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BACKOFF_MS = 30_000;

type Row = { id: string; title: string; bggId: number | null };

type Outcome =
  | { status: "updated"; title: string; matchedTitle: string }
  | { status: "needs-review"; title: string; candidateCount: number }
  | { status: "failed"; title: string; error: string };

async function translateGameData(data: BggGameData): Promise<BggGameData> {
  const mechanics = translateMechanics(data.mechanics);
  if (!data.description) {
    return { ...data, mechanics };
  }
  try {
    const description = await translateToGerman(data.description);
    return { ...data, description, mechanics };
  } catch (error) {
    // Schlägt die Übersetzung fehl (z. B. MyMemorys Tageslimit), bleibt die
    // englische Beschreibung stehen statt sie zu leeren — analog zu
    // `translateBggGameData()` in `board-games-bgg-import.ts` (#184).
    console.warn(`  Übersetzung fehlgeschlagen für "${data.title}":`, error);
    return { ...data, mechanics };
  }
}

async function resolveBggId(
  row: Row,
): Promise<
  | { bggId: number }
  | { error: "needs-review"; reason: "needs-review"; candidateCount: number }
  | { error: string; reason: "failed" }
> {
  if (row.bggId) return { bggId: row.bggId };

  const candidates = await withRateLimitRetry(() =>
    searchBggGamesExact(row.title),
  );
  if (candidates.length !== 1) {
    return {
      error: "needs-review",
      reason: "needs-review",
      candidateCount: candidates.length,
    };
  }
  return { bggId: candidates[0].bggId };
}

/** BGGs 429 ist meist eine kurzfristige Drossel, keine dauerhafte Sperre —
 * ein paar Anläufe mit langer Pause dazwischen kommen fast immer durch. */
async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error instanceof BggApiError && error.status === 429;
      if (!isRateLimit || attempt >= RATE_LIMIT_RETRIES) throw error;
      console.warn(
        `  429 von BGG — warte ${RATE_LIMIT_BACKOFF_MS / 1000}s (Versuch ${attempt + 1}/${RATE_LIMIT_RETRIES})…`,
      );
      await sleep(RATE_LIMIT_BACKOFF_MS);
    }
  }
}

async function refreshOne(row: Row): Promise<Outcome> {
  const resolved = await resolveBggId(row);
  if ("error" in resolved) {
    if (resolved.reason === "needs-review") {
      return {
        status: "needs-review",
        title: row.title,
        candidateCount: resolved.candidateCount,
      };
    }
    return { status: "failed", title: row.title, error: resolved.error };
  }

  // Ein per Titelsuche gefundener bggId kann bereits einem ANDEREN Titel im
  // Bestand gehören (bggId ist unique) — dann nicht überschreiben, sondern
  // zur manuellen Prüfung markieren.
  if (!row.bggId) {
    const conflict = await prisma.boardGame.findUnique({
      where: { bggId: resolved.bggId },
      select: { id: true },
    });
    if (conflict && conflict.id !== row.id) {
      return {
        status: "failed",
        title: row.title,
        error: `bggId ${resolved.bggId} gehört bereits zu einem anderen Titel.`,
      };
    }
  }

  await sleep(THROTTLE_MS);
  let raw: BggGameData;
  try {
    raw = await withRateLimitRetry(() => fetchBggGame(resolved.bggId));
  } catch (error) {
    if (error instanceof BggNotFoundError || error instanceof BggApiError) {
      return { status: "failed", title: row.title, error: error.message };
    }
    throw error;
  }

  const data = await translateGameData(raw);
  const publisher = resolvePublisherFromVersions(data.versions);

  await prisma.$transaction(async (tx) => {
    await tx.boardGame.update({
      where: { id: row.id },
      data: {
        title: data.title,
        bggId: resolved.bggId,
        kind: data.kind,
        minPlayers: data.minPlayers,
        maxPlayers: data.maxPlayers,
        playTimeMinutes: data.playTimeMinutes,
        weight: data.weight,
        averageRating: data.averageRating,
        imageUrl: data.imageUrl,
        description: data.description,
        mechanics: data.mechanics,
        explainerVideoUrl: data.explainerVideoUrl,
        languageDependence: data.languageDependence,
        publisher: publisher.value ?? [],
        author: data.author,
        yearPublished: data.yearPublished,
      },
    });

    // Alternativnamen komplett aus BGG neu aufbauen — die Demodaten hatten
    // hier keine belastbare Auswahl.
    await tx.boardGameAlternateName.deleteMany({
      where: { boardGameId: row.id },
    });
    if (data.alternateNames.length > 0) {
      await tx.boardGameAlternateName.createMany({
        data: data.alternateNames.map((name) => ({
          boardGameId: row.id,
          name,
        })),
      });
    }
  });

  return { status: "updated", title: row.title, matchedTitle: data.title };
}

async function loadRows(): Promise<Row[]> {
  const titlesFile = process.argv[2];
  const where = titlesFile
    ? {
        title: {
          in: fs
            .readFileSync(titlesFile, "utf-8")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        },
      }
    : {};

  return prisma.boardGame.findMany({
    where,
    select: { id: true, title: true, bggId: true },
    orderBy: { title: "asc" },
  });
}

async function main() {
  const rows = await loadRows();

  console.log(`${rows.length} Titel im Bestand — starte BGG-Abgleich.\n`);

  const outcomes: Outcome[] = [];
  for (const [index, row] of rows.entries()) {
    process.stdout.write(`[${index + 1}/${rows.length}] ${row.title} … `);
    try {
      const outcome = await refreshOne(row);
      outcomes.push(outcome);
      console.log(outcome.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcomes.push({ status: "failed", title: row.title, error: message });
      console.log(`failed (${message})`);
    }
    await sleep(THROTTLE_MS);
  }

  const updated = outcomes.filter((o) => o.status === "updated");
  const needsReview = outcomes.filter((o) => o.status === "needs-review");
  const failed = outcomes.filter((o) => o.status === "failed");

  console.log(`\n${updated.length} aktualisiert.`);
  if (needsReview.length > 0) {
    console.log(`\n${needsReview.length} ohne eindeutigen BGG-Treffer:`);
    for (const o of needsReview) {
      if (o.status === "needs-review") {
        console.log(`  - ${o.title} (${o.candidateCount} Treffer)`);
      }
    }
  }
  if (failed.length > 0) {
    console.log(`\n${failed.length} fehlgeschlagen:`);
    for (const o of failed) {
      if (o.status === "failed") {
        console.log(`  - ${o.title}: ${o.error}`);
      }
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
