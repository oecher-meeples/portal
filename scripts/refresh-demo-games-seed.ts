/**
 * Einmaliger Datenpflege-Lauf: gleicht `prisma/seed-data/demo-games.ts` erneut
 * mit BoardGameGeek ab und schreibt die Datei direkt neu — im Unterschied zu
 * `refresh-board-games-from-bgg.ts` (schreibt in die DB) bleibt dieser Lauf
 * auf der Seed-Quelldatei, rührt also keine laufende Dev-/Prod-DB an. Nutzt
 * bewusst dieselben Bausteine wie der reguläre BGG-Import (`fetchBggGame`,
 * `searchBggGamesExact`, `translateToGerman`, `translateMechanics`,
 * `translateCategories`, `bggDataToTitleInput`) statt die BGG-Mapping-Logik
 * zu duplizieren.
 *
 * `title` bleibt in jedem Fall der bisherige Marketingname (siehe Dateikopf
 * von `demo-games.ts`) — alle anderen `DemoGame`-Felder werden aus dem
 * BGG-Treffer übernommen. Titel ohne eindeutigen BGG-Treffer (0 oder >1
 * Ergebnis) behalten ihre bisherigen Werte (bzw. `null`/`[]`, falls ein Feld
 * noch nie befüllt war).
 *
 * Aufruf:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/refresh-demo-games-seed.ts
 */
import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  searchBggGamesExact,
  type BggGameData,
} from "../src/lib/bgg/client";
import { translateToGerman } from "../src/lib/bgg/translate";
import { translateMechanics } from "../src/lib/ludothek/mechanics-translations";
import { translateCategories } from "../src/lib/ludothek/category-translations";
import { bggDataToTitleInput } from "../src/lib/ludothek/board-game-versions";
import { bggContributorInputs } from "../src/lib/ludothek/taxonomy/bgg-contributors";
import { sleep } from "../src/lib/utils/sleep";
import {
  BGG_SCRIPT_THROTTLE_MS as THROTTLE_MS,
  withRateLimitRetry,
} from "./lib/bgg-rate-limit";
import { DEMO_GAMES, type DemoGame } from "../prisma/seed-data/demo-games";
import {
  SEED_FILE,
  demoPublisherBggIds,
  pickDemoVersion,
  rewriteSeedFile,
  toDemoVersion,
  withVersionPublishers,
} from "./lib/demo-games-seed-file";

type Outcome =
  | { status: "updated"; title: string; matchedTitle: string }
  | { status: "needs-review"; title: string; candidateCount: number }
  | { status: "unchanged"; title: string; reason: string };

/** Alle BGG-Felder, die ein Titel ohne (neuen) Treffer behält — entweder vom
 * vorigen Lauf (Rerun) oder `null`/`[]`, falls dieser Lauf die Felder zum
 * ersten Mal einführt. */
function withoutBggMatch(game: DemoGame): DemoGame {
  return {
    title: game.title,
    bggId: game.bggId ?? null,
    imageUrl: game.imageUrl ?? null,
    minPlayers: game.minPlayers ?? null,
    maxPlayers: game.maxPlayers ?? null,
    playTimeMinutes: game.playTimeMinutes ?? null,
    weight: game.weight ?? null,
    averageRating: game.averageRating ?? null,
    description: game.description ?? "",
    mechanics: game.mechanics ?? [],
    categories: game.categories ?? [],
    explainerVideoUrl: game.explainerVideoUrl ?? null,
    languageDependence: game.languageDependence ?? null,
    contributors: game.contributors ?? [],
    yearPublished: game.yearPublished ?? null,
    traits: game.traits ?? [],
    version: game.version ?? null,
  };
}

async function translateGameData(
  data: BggGameData,
): Promise<{ data: BggGameData; descriptionTranslationFailed: boolean }> {
  const mechanics = translateMechanics(data.mechanics);
  const categories = translateCategories(data.categories);
  if (!data.description) {
    return {
      data: { ...data, mechanics, categories },
      descriptionTranslationFailed: false,
    };
  }
  try {
    const description = await translateToGerman(data.description);
    return {
      data: { ...data, description, mechanics, categories },
      descriptionTranslationFailed: false,
    };
  } catch (error) {
    console.warn(`  Übersetzung fehlgeschlagen für "${data.title}":`, error);
    return {
      data: { ...data, mechanics, categories },
      descriptionTranslationFailed: true,
    };
  }
}

async function refreshOne(
  game: DemoGame,
): Promise<{ outcome: Outcome; updated: DemoGame }> {
  const candidates = await withRateLimitRetry(() =>
    searchBggGamesExact(game.title),
  );
  if (candidates.length !== 1) {
    return {
      outcome: {
        status: "needs-review",
        title: game.title,
        candidateCount: candidates.length,
      },
      updated: withoutBggMatch(game),
    };
  }

  await sleep(THROTTLE_MS);
  let raw: BggGameData;
  try {
    raw = await withRateLimitRetry(() => fetchBggGame(candidates[0].bggId));
  } catch (error) {
    if (error instanceof BggNotFoundError || error instanceof BggApiError) {
      return {
        outcome: {
          status: "unchanged",
          title: game.title,
          reason: error.message,
        },
        updated: withoutBggMatch(game),
      };
    }
    throw error;
  }

  const { data, descriptionTranslationFailed } = await translateGameData(raw);
  const mapped = bggDataToTitleInput(candidates[0].bggId, data);
  // Schlägt die Übersetzung fehl (z. B. MyMemorys Tageslimit), bleibt eine
  // bereits vorhandene (vermutlich deutsche) Beschreibung aus einem früheren
  // Lauf stehen, statt sie mit frischem, unübersetztem Englisch zu
  // überschreiben — nur ohne jede bisherige Beschreibung wird die englische
  // übernommen (besser als leer). Ein späterer Rerun (nach Reset der
  // Tagesquote) holt die Übersetzung nach.
  const description =
    descriptionTranslationFailed && game.description
      ? game.description
      : (mapped.description ?? game.description);

  const publishers = (mapped.version?.publishers ?? []).map((publisher) => ({
    role: "PUBLISHER" as const,
    bggId: publisher.bggId,
    name: publisher.name,
  }));
  // Konkrete BGG-Version zu diesen Verlagen — die Demo-Exemplare gehören zu
  // ihr. Ohne eindeutigen Verlag liefert sie die Verlage gleich mit.
  const demoVersion = pickDemoVersion(
    data.versions,
    demoPublisherBggIds({ ...game, contributors: publishers }),
  );
  const contributors = [...publishers, ...bggContributorInputs(data)];

  return {
    outcome: {
      status: "updated",
      title: game.title,
      matchedTitle: data.title,
    },
    updated: {
      title: game.title,
      bggId: mapped.bggId,
      imageUrl: mapped.imageUrl ?? null,
      minPlayers: mapped.minPlayers ?? null,
      maxPlayers: mapped.maxPlayers ?? null,
      playTimeMinutes: mapped.playTimeMinutes ?? null,
      weight: mapped.weight ?? null,
      averageRating: mapped.averageRating ?? null,
      description,
      mechanics: mapped.mechanics,
      categories: mapped.categories,
      explainerVideoUrl: mapped.explainerVideoUrl ?? null,
      languageDependence: mapped.languageDependence ?? null,
      // Verlage hängen in der Seed-Datei weiter am Titel (der Seed legt daraus
      // die Edition der Demo-Exemplare an), Autoren/Illustratoren am Spiel.
      contributors:
        demoVersion && publishers.length === 0
          ? withVersionPublishers(contributors, demoVersion)
          : contributors,
      yearPublished: mapped.yearPublished ?? null,
      traits: mapped.traits,
      version: demoVersion ? toDemoVersion(demoVersion) : null,
    },
  };
}

async function main() {
  console.log(`${DEMO_GAMES.length} Demo-Titel — starte BGG-Abgleich.\n`);

  const outcomes: Outcome[] = [];
  const updatedGames: DemoGame[] = [];

  for (const [index, game] of DEMO_GAMES.entries()) {
    process.stdout.write(
      `[${index + 1}/${DEMO_GAMES.length}] ${game.title} … `,
    );
    try {
      const { outcome, updated } = await refreshOne(game);
      outcomes.push(outcome);
      updatedGames.push(updated);
      console.log(outcome.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcomes.push({
        status: "unchanged",
        title: game.title,
        reason: message,
      });
      updatedGames.push(withoutBggMatch(game));
      console.log(`unchanged (${message})`);
    }
    await sleep(THROTTLE_MS);
  }

  const updated = outcomes.filter((o) => o.status === "updated");
  const needsReview = outcomes.filter((o) => o.status === "needs-review");
  const unchanged = outcomes.filter((o) => o.status === "unchanged");

  console.log(`\n${updated.length} aktualisiert.`);
  if (needsReview.length > 0) {
    console.log(`\n${needsReview.length} ohne eindeutigen BGG-Treffer:`);
    for (const o of needsReview) {
      if (o.status === "needs-review") {
        console.log(`  - ${o.title} (${o.candidateCount} Treffer)`);
      }
    }
  }
  if (unchanged.length > 0) {
    console.log(`\n${unchanged.length} unverändert (Fehler/kein Treffer):`);
    for (const o of unchanged) {
      if (o.status === "unchanged") {
        console.log(`  - ${o.title}: ${o.reason}`);
      }
    }
  }

  const runDate = new Date().toISOString().slice(0, 10);
  rewriteSeedFile(updatedGames, runDate);
  console.log(`\n${SEED_FILE} neu geschrieben.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
