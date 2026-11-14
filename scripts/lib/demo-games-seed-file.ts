import fs from "node:fs";
import path from "node:path";
import { BoardGameTrait, LanguageDependence } from "@prisma/client";
import type { BggVersion } from "../../src/lib/bgg/client";
import { selectRelevantVersions } from "../../src/lib/ludothek/board-game-versions";
import type { DemoGame, DemoVersion } from "../../prisma/seed-data/demo-games";

/** Lesen/Schreiben von `prisma/seed-data/demo-games.ts` — geteilt von
 * `refresh-demo-games-seed.ts` (alle Felder) und
 * `backfill-demo-game-versions.ts` (nur die Version). */
export const SEED_FILE = path.join(
  __dirname,
  "../../prisma/seed-data/demo-games.ts",
);

function enumRef(
  enumName: "BoardGameTrait" | "LanguageDependence",
  enumObj: Record<string, string>,
  value: string,
): string {
  const key = Object.keys(enumObj).find((k) => enumObj[k] === value);
  if (!key) throw new Error(`Unbekannter ${enumName}-Wert: ${value}`);
  return `${enumName}.${key}`;
}

export function serializeEntry(game: DemoGame): string {
  const num = (n: number | null) => (n === null ? "null" : String(n));
  const strArray = (values: string[]) =>
    `[${values.map((v) => JSON.stringify(v)).join(", ")}]`;
  const traitsArray = (values: BoardGameTrait[]) =>
    `[${values.map((v) => enumRef("BoardGameTrait", BoardGameTrait, v)).join(", ")}]`;

  const parts = [
    `title: ${JSON.stringify(game.title)}`,
    `bggId: ${num(game.bggId)}`,
    `imageUrl: ${game.imageUrl === null ? "null" : JSON.stringify(game.imageUrl)}`,
    `minPlayers: ${num(game.minPlayers)}`,
    `maxPlayers: ${num(game.maxPlayers)}`,
    `playTimeMinutes: ${num(game.playTimeMinutes)}`,
    `weight: ${num(game.weight)}`,
    `averageRating: ${num(game.averageRating)}`,
    `description: ${JSON.stringify(game.description)}`,
    `mechanics: ${strArray(game.mechanics)}`,
    `categories: ${strArray(game.categories)}`,
    `explainerVideoUrl: ${game.explainerVideoUrl === null ? "null" : JSON.stringify(game.explainerVideoUrl)}`,
    `languageDependence: ${
      game.languageDependence === null
        ? "null"
        : enumRef(
            "LanguageDependence",
            LanguageDependence,
            game.languageDependence,
          )
    }`,
    `contributors: ${JSON.stringify(game.contributors)}`,
    `yearPublished: ${num(game.yearPublished)}`,
    `traits: ${traitsArray(game.traits)}`,
    `version: ${JSON.stringify(game.version ?? null)}`,
  ];
  return `  { ${parts.join(", ")} },`;
}

/**
 * Schreibt die Einträge von `DEMO_GAMES` neu. Kopf, Typen und `// Batch`-
 * Kommentare bleiben stehen; mit `refreshDate` wird nur das Datum des letzten
 * vollständigen BGG-Abgleichs im Dateikopf ersetzt.
 */
export function rewriteSeedFile(
  updatedGames: DemoGame[],
  refreshDate?: string,
) {
  const raw = fs.readFileSync(SEED_FILE, "utf-8");
  const lines = raw.split("\n");

  const arrayStartIdx = lines.findIndex(
    (l) => l.trim() === "export const DEMO_GAMES: DemoGame[] = [",
  );
  const arrayEndIdx = lines.findIndex(
    (l, i) => i > arrayStartIdx && l.trim() === "];",
  );
  if (arrayStartIdx === -1 || arrayEndIdx === -1) {
    throw new Error(
      "Erwartete Marker (`export const DEMO_GAMES...[`, `];`) nicht gefunden — Datei manuell prüfen.",
    );
  }

  let entryIndex = 0;
  const bodyLines: string[] = [];
  for (let i = arrayStartIdx + 1; i < arrayEndIdx; i++) {
    const line = lines[i];
    if (line.trim().startsWith("// Batch") || line.trim() === "") {
      bodyLines.push(line);
    } else if (line.trim().startsWith("{ title:")) {
      const game = updatedGames[entryIndex];
      if (!game) {
        throw new Error(
          `Mehr Entry-Zeilen in der Datei als Einträge in DEMO_GAMES (Index ${entryIndex}).`,
        );
      }
      bodyLines.push(serializeEntry(game));
      entryIndex++;
    } else {
      throw new Error(`Unerwartete Zeile beim Umschreiben: "${line}"`);
    }
  }
  if (entryIndex !== updatedGames.length) {
    throw new Error(
      `${entryIndex} Entry-Zeilen gefunden, aber ${updatedGames.length} Einträge in DEMO_GAMES — Abgleich abgebrochen, Datei NICHT geschrieben.`,
    );
  }

  let head = lines.slice(0, arrayStartIdx + 1).join("\n");
  if (refreshDate) {
    head = head.replace(
      /\(\d{4}-\d{2}-\d{2}, `scripts\/refresh-demo-games-seed\.ts`\)/,
      `(${refreshDate}, \`scripts/refresh-demo-games-seed.ts\`)`,
    );
  }
  fs.writeFileSync(SEED_FILE, [head, ...bodyLines, "];", ""].join("\n"));
}

function sameIds(a: number[], b: number[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Die konkrete BGG-Version zu den Demo-Verlagen: gleiche Verlage (per BGG-ID),
 * deutsche bevorzugt, bei mehreren die älteste (Erstauflage), dann die
 * kleinste Version-ID — deterministisch, damit ein Rerun dieselbe wählt.
 * Ohne Demo-Verlage zählt jede Version (die Verlage kommen dann aus ihr).
 * `null` ohne passende Version.
 */
export function pickDemoVersion(
  versions: BggVersion[],
  publisherBggIds: number[],
): BggVersion | null {
  const matching =
    publisherBggIds.length === 0
      ? versions
      : versions.filter((v) =>
          sameIds(
            v.publisherLinks.map((link) => link.bggId),
            publisherBggIds,
          ),
        );
  const [best] = selectRelevantVersions(matching).sort(
    (a, b) =>
      (a.yearPublished ?? Infinity) - (b.yearPublished ?? Infinity) ||
      (a.bggVersionId ?? Infinity) - (b.bggVersionId ?? Infinity),
  );
  return best ?? null;
}

export function toDemoVersion(version: BggVersion): DemoVersion {
  return {
    bggVersionId: version.bggVersionId,
    name: version.name,
    yearPublished: version.yearPublished,
    productCode: version.productCode,
    languages: version.languages,
  };
}

/** Ersetzt die Demo-Verlage durch die der gewählten Version. */
export function withVersionPublishers(
  contributors: DemoGame["contributors"],
  version: BggVersion,
): DemoGame["contributors"] {
  return [
    ...version.publisherLinks.map((link) => ({
      role: "PUBLISHER" as const,
      bggId: link.bggId,
      name: link.name,
    })),
    ...contributors.filter((c) => c.role !== "PUBLISHER"),
  ];
}

/** BGG-IDs der Demo-Verlage eines Titels. */
export function demoPublisherBggIds(game: DemoGame): number[] {
  return game.contributors.flatMap((c) =>
    c.role === "PUBLISHER" && c.bggId !== null ? [c.bggId] : [],
  );
}
