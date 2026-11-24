/**
 * Deutsche Beschreibungen für den Release-Seed (#603) pflegen — einmalige
 * Übersetzungsarbeit, ohne Übersetzungsdienst.
 *
 *   npx tsx scripts/release-descriptions-de.ts pending [anzahl] [datei]
 *     schreibt die nächsten noch unübersetzten Beschreibungen als JSON
 *     (`{ bggId, title, description }[]`) in `datei` (Default: stdout)
 *   npx tsx scripts/release-descriptions-de.ts apply <datei>
 *     übernimmt `{ "<bggId>": "<deutscher Text>" }` aus `datei` nach
 *     `prisma/seed-data/release-descriptions-de.json`
 *   npx tsx scripts/release-descriptions-de.ts status
 */
import fs from "node:fs";
import path from "node:path";
import { parseReleaseInventory } from "../prisma/seed-data/release-inventory";
import {
  readReleaseBoardGames,
  readReleaseDescriptionsDe,
  RELEASE_BOARD_GAMES_FILE,
  RELEASE_DESCRIPTIONS_DE_FILE,
} from "../prisma/seed-data/release-board-games";

const ROOT = path.join(__dirname, "..");
const games = readReleaseBoardGames(path.join(ROOT, RELEASE_BOARD_GAMES_FILE));
const descriptionsFile = path.join(ROOT, RELEASE_DESCRIPTIONS_DE_FILE);
const descriptions = readReleaseDescriptionsDe(descriptionsFile);

// Nur Titel mit stabiler Zuordnung übersetzen — `picked`/`fuzzy` können
// sich bei einer Neubewertung (`--repick`) noch ändern. `--all` hebt das auf.
const stableIds = new Set(
  parseReleaseInventory(
    fs.readFileSync(
      path.join(ROOT, "prisma/seed-data/release-inventory.csv"),
      "utf-8",
    ),
  )
    .filter(
      (r) =>
        process.argv.includes("--all") ||
        r.bggMatch === "exact" ||
        r.bggMatch === "manual",
    )
    .flatMap((r) => (r.bggId ? [r.bggId] : [])),
);

const untranslated = Object.entries(games)
  .filter(
    ([id, game]) =>
      stableIds.has(Number(id)) &&
      game.input.description &&
      !descriptions[Number(id)],
  )
  .map(([id, game]) => ({
    bggId: Number(id),
    title: game.input.title,
    description: game.input.description!,
  }));

const [, , command, arg, out] = process.argv.filter((a) => a !== "--all");

if (command === "pending") {
  const batch = JSON.stringify(
    untranslated.slice(0, Number(arg ?? 10)),
    null,
    2,
  );
  if (out) fs.writeFileSync(out, batch);
  else console.log(batch);
} else if (command === "apply" && arg) {
  const incoming = JSON.parse(fs.readFileSync(arg, "utf-8")) as Record<
    string,
    string
  >;
  for (const [id, text] of Object.entries(incoming)) {
    if (!games[Number(id)]) throw new Error(`Unbekannte bggId ${id}`);
    if (!text.trim()) throw new Error(`Leere Übersetzung für ${id}`);
    descriptions[Number(id)] = text.trim();
  }
  const sorted = Object.fromEntries(
    Object.entries(descriptions).sort(([a], [b]) => Number(a) - Number(b)),
  );
  fs.writeFileSync(descriptionsFile, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(
    `${Object.keys(incoming).length} übernommen, ${untranslated.length - Object.keys(incoming).length} offen.`,
  );
} else if (command === "status") {
  console.log(
    `${Object.keys(descriptions).length} übersetzt, ${untranslated.length} offen (${untranslated.reduce((n, d) => n + d.description.length, 0)} Zeichen).`,
  );
} else {
  console.error("usage: pending [anzahl] [datei] | apply <datei> | status");
  process.exitCode = 1;
}
