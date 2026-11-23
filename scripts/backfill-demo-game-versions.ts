/**
 * Einmaliger Datenpflege-Lauf: ergänzt in `prisma/seed-data/demo-games.ts`
 * je Titel die BGG-Version, aus der die Demo-Verlage stammen (`version`).
 * Titel ohne Demo-Verlag bekommen die älteste deutsche Version samt deren
 * Verlagen. Titel mit bereits gesetzter BGG-Version werden übersprungen
 * (Rerun nach Abbruch/429 holt nur den Rest).
 * Anders als `refresh-demo-games-seed.ts` holt er nur die Versionen — keine
 * Übersetzung, alle anderen Felder bleiben unverändert.
 *
 * Aufruf:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/backfill-demo-game-versions.ts
 */
import { fetchBggGame } from "../src/lib/bgg/client";
import { sleep } from "../src/lib/utils/sleep";
import {
  BGG_SCRIPT_THROTTLE_MS as THROTTLE_MS,
  withRateLimitRetry,
} from "./lib/bgg-rate-limit";
import {
  SEED_FILE,
  demoPublisherBggIds,
  pickDemoVersion,
  rewriteSeedFile,
  toDemoVersion,
  withVersionPublishers,
} from "./lib/demo-games-seed-file";
import { DEMO_GAMES, type DemoGame } from "../prisma/seed-data/demo-games";

async function main() {
  console.log(`${DEMO_GAMES.length} Demo-Titel — lade BGG-Versionen.\n`);
  const updated: DemoGame[] = [];
  const missing: string[] = [];
  const nonGerman: string[] = [];

  for (const [index, game] of DEMO_GAMES.entries()) {
    process.stdout.write(
      `[${index + 1}/${DEMO_GAMES.length}] ${game.title} … `,
    );
    const publisherIds = demoPublisherBggIds(game);
    if (game.version?.bggVersionId != null) {
      updated.push(game);
      console.log("bereits vorhanden");
      continue;
    }
    if (game.bggId === null) {
      updated.push({ ...game, version: game.version ?? null });
      missing.push(`${game.title} (ohne BGG-ID)`);
      console.log("übersprungen");
      continue;
    }
    try {
      const data = await withRateLimitRetry(() =>
        fetchBggGame(game.bggId as number),
      );
      const picked = pickDemoVersion(data.versions, publisherIds);
      updated.push({
        ...game,
        contributors:
          picked && publisherIds.length === 0
            ? withVersionPublishers(game.contributors, picked)
            : game.contributors,
        version: picked ? toDemoVersion(picked) : null,
      });
      if (!picked)
        missing.push(`${game.title} (keine Version mit den Verlagen)`);
      else if (!picked.languages.includes("German"))
        nonGerman.push(`${game.title}: ${picked.languages.join(", ")}`);
      console.log(picked ? (picked.name ?? picked.bggVersionId) : "keine");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updated.push({ ...game, version: game.version ?? null });
      missing.push(`${game.title} (Fehler: ${message})`);
      console.log(`Fehler (${message})`);
    }
    await sleep(THROTTLE_MS);
  }

  rewriteSeedFile(updated);
  console.log(`\n${SEED_FILE} neu geschrieben.`);
  if (missing.length > 0) {
    console.log(`\n${missing.length} ohne BGG-Version:`);
    for (const line of missing) console.log(`  - ${line}`);
  }
  if (nonGerman.length > 0) {
    console.log(`\n${nonGerman.length} mit nicht-deutscher Version:`);
    for (const line of nonGerman) console.log(`  - ${line}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
