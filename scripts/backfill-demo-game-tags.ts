/**
 * Einmaliger Datenpflege-Lauf (Epic #490 Strang B): ergänzt in
 * `prisma/seed-data/demo-games.ts` je Titel die Mechaniken/Kategorien als
 * `tags` mit BGG-ID und englischem Originalnamen. Titel mit BGG-ID holen sie
 * frisch von BGG; Titel ohne BGG-ID mappen ihre vorhandenen (übersetzten)
 * `mechanics`/`categories` über `TAG_DISPLAY_NAMES` zurück auf den englischen
 * Namen, ohne BGG-ID. Titel mit bereits gesetzten Tags werden übersprungen
 * (Rerun nach Abbruch/429 holt nur den Rest). Alle anderen Felder bleiben
 * unverändert.
 *
 * Aufruf:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/backfill-demo-game-tags.ts
 */
import type { TagType } from "@prisma/client";
import { fetchBggGame } from "../src/lib/bgg/client";
import { bggTagInputs } from "../src/lib/ludothek/taxonomy/tags";
import { sleep } from "../src/lib/utils/sleep";
import {
  BGG_SCRIPT_THROTTLE_MS as THROTTLE_MS,
  withRateLimitRetry,
} from "./lib/bgg-rate-limit";
import { SEED_FILE, rewriteSeedFile } from "./lib/demo-games-seed-file";
import { DEMO_GAMES, type DemoGame } from "../prisma/seed-data/demo-games";
import { TAG_DISPLAY_NAMES } from "../prisma/seed-data/tag-display-names";

/** Übersetzter Anzeigename → englischer BGG-Name, je Typ. Bei mehreren
 * Originalen zum selben Anzeigenamen gewinnt der erste Eintrag. */
function toOriginalName(type: TagType, label: string): string {
  const match = TAG_DISPLAY_NAMES.find(
    (entry) => entry.type === type && entry.displayName === label,
  );
  return match?.name ?? label;
}

function tagsFromLabels(game: DemoGame): DemoGame["tags"] {
  return [
    ...game.mechanics.map((label) => ({
      type: "MECHANIC" as const,
      bggId: null,
      name: toOriginalName("MECHANIC", label),
    })),
    ...game.categories.map((label) => ({
      type: "CATEGORY" as const,
      bggId: null,
      name: toOriginalName("CATEGORY", label),
    })),
  ];
}

async function main() {
  console.log(`${DEMO_GAMES.length} Demo-Titel — lade BGG-Tags.\n`);
  const updated: DemoGame[] = [];
  const failed: string[] = [];

  for (const [index, game] of DEMO_GAMES.entries()) {
    process.stdout.write(
      `[${index + 1}/${DEMO_GAMES.length}] ${game.title} … `,
    );
    if (game.tags.length > 0) {
      updated.push(game);
      console.log("bereits vorhanden");
      continue;
    }
    if (game.bggId === null) {
      const tags = tagsFromLabels(game);
      updated.push({ ...game, tags });
      console.log(`${tags.length} aus Labels`);
      continue;
    }
    try {
      const data = await withRateLimitRetry(() =>
        fetchBggGame(game.bggId as number),
      );
      const tags = bggTagInputs(data);
      updated.push({ ...game, tags });
      console.log(`${tags.length} von BGG`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updated.push(game);
      failed.push(`${game.title} (${message})`);
      console.log(`Fehler (${message})`);
    }
    await sleep(THROTTLE_MS);
  }

  rewriteSeedFile(updated);
  console.log(`\n${SEED_FILE} neu geschrieben.`);
  if (failed.length > 0) {
    console.log(`\n${failed.length} fehlgeschlagen (Rerun holt sie nach):`);
    for (const line of failed) console.log(`  - ${line}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
