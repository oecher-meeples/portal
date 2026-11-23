/**
 * Befüllt die leeren `bggId`s in `prisma/seed-data/release-inventory.csv`
 * (#603) per exakter BGG-Titelsuche vor. Nur ein eindeutiger Treffer wird
 * eingetragen; mehrdeutige und fehlende Titel landen in der Ausgabe und
 * werden von Hand in der CSV nachgetragen. Eingetragene `bggId`s fasst das
 * Skript nie an — es ist also beliebig oft wiederholbar (z. B. nach einem
 * Rate-Limit-Abbruch).
 *
 * Aufruf:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/match-release-inventory-bgg.ts
 */
import fs from "node:fs";
import path from "node:path";
import { sleep } from "../src/lib/utils/sleep";
import {
  BGG_REQUEST_THROTTLE_MS,
  searchBggGamesExact,
  type BggSearchResult,
} from "../src/lib/bgg/client";
import {
  parseReleaseInventory,
  serializeReleaseInventory,
} from "../prisma/seed-data/release-inventory";

const CSV = path.join(__dirname, "../prisma/seed-data/release-inventory.csv");

/** Nach so vielen Suchen wird die CSV zwischengespeichert. */
const SAVE_EVERY = 25;

async function main() {
  const rows = parseReleaseInventory(fs.readFileSync(CSV, "utf-8"));
  const save = () => fs.writeFileSync(CSV, serializeReleaseInventory(rows));

  const titles = [...new Set(rows.filter((r) => !r.bggId).map((r) => r.title))];
  console.log(`${titles.length} Titel ohne bggId werden gesucht …`);

  const ambiguous: string[] = [];
  const missing: string[] = [];
  let matched = 0;

  for (const [index, title] of titles.entries()) {
    let results: BggSearchResult[];
    try {
      results = await searchBggGamesExact(title);
    } catch (error) {
      save();
      throw new Error(
        `Abbruch bei "${title}" (${index}/${titles.length}): ${(error as Error).message} — erneut starten setzt fort.`,
      );
    }

    if (results.length === 1) {
      for (const row of rows) {
        if (row.title === title && !row.bggId) row.bggId = results[0].bggId;
      }
      matched += 1;
    } else if (results.length === 0) {
      missing.push(title);
    } else {
      ambiguous.push(
        `${title}: ${results
          .slice(0, 5)
          .map((r) => `${r.bggId} (${r.yearPublished ?? "?"})`)
          .join(", ")}`,
      );
    }

    if ((index + 1) % SAVE_EVERY === 0) save();
    await sleep(BGG_REQUEST_THROTTLE_MS);
  }
  save();

  console.log(`\n${matched} Titel eindeutig zugeordnet.`);
  if (ambiguous.length > 0) {
    console.log(
      `\nMehrdeutig (${ambiguous.length}) — bggId von Hand eintragen:`,
    );
    for (const line of ambiguous) console.log(`  - ${line}`);
  }
  if (missing.length > 0) {
    console.log(`\nKein exakter Treffer (${missing.length}):`);
    for (const title of missing) console.log(`  - ${title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
