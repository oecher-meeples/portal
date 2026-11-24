import fs from "node:fs";
import type { BggGameData, BggVersion } from "../../src/lib/bgg/client";
import type { BoardGameTitleInput } from "../../src/lib/ludothek/board-game-title-lookup";
import {
  bggDataToTitleInput,
  isGermanVersion,
  versionInputFromBgg,
} from "../../src/lib/ludothek/board-game-versions";
import type { VersionInput } from "../../src/lib/ludothek/taxonomy/versions";

/**
 * BGG-Titeldaten für den Release-Seed (#603), einmalig per
 * `scripts/enrich-release-inventory-bgg.ts` abgerufen und committet — der
 * Seed ruft BGG nie selbst auf. Schlüssel ist die `bggId`.
 */
export interface ReleaseBoardGame {
  /** Wie `bggDataToTitleInput()`, ohne Edition; `description` englisch. */
  input: BoardGameTitleInput & { bggId: number };
  alternateNames: string[];
  /** Deutsche Edition, an die der Seed die Exemplare hängt — `null`, wenn
   * BGG keine kennt. */
  version: VersionInput | null;
  /** Wie die Edition gewählt wurde, zur Durchsicht: `single` = einzige
   * deutsche, `title` = Name passt zum Vereinstitel, `latest` = neueste
   * von mehreren deutschen (prüfen!), `none` = keine deutsche. */
  versionPick: VersionPick;
}

export type VersionPick = "single" | "title" | "latest" | "none";

export type ReleaseBoardGames = Record<number, ReleaseBoardGame>;

/** Relativ zum Repo bzw. im Container zu `/app/db` (siehe Dockerfile). */
export const RELEASE_BOARD_GAMES_FILE =
  "prisma/seed-data/release-board-games.json";

export function readReleaseBoardGames(file: string): ReleaseBoardGames {
  return fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf-8")) as ReleaseBoardGames)
    : {};
}

export function writeReleaseBoardGames(file: string, games: ReleaseBoardGames) {
  fs.writeFileSync(file, `${JSON.stringify(games, null, 2)}\n`);
}

/** Deutsche Beschreibungen je `bggId` — getrennt von den BGG-Daten, damit
 * ein erneuter BGG-Abruf die Übersetzungen nie überschreibt. Fehlt ein
 * Eintrag, nimmt der Seed die englische Beschreibung. */
export const RELEASE_DESCRIPTIONS_DE_FILE =
  "prisma/seed-data/release-descriptions-de.json";

export type ReleaseDescriptionsDe = Record<number, string>;

export function readReleaseDescriptionsDe(file: string): ReleaseDescriptionsDe {
  return fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf-8")) as ReleaseDescriptionsDe)
    : {};
}

/** Vergleichsform eines Titels: ohne Groß/klein, Satzzeichen und führenden
 * Artikel — „Die Quacksalber von Quedlinburg" = „Quacksalber von
 * Quedlinburg", „Shadows: Amsterdam" = „Shadows Amsterdam". */
export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^(die|der|das|the|le|la|les) /, "");
}

/** Kennt BGG den Vereinstitel als Haupt- oder Alternativnamen? Liefert die
 * BGG-Schreibweise. */
export function bggNameFor(
  clubTitle: string,
  names: { title: string; alternateNames: string[] },
) {
  const wanted = normalizeTitle(clubTitle);
  return [names.title, ...names.alternateNames].find(
    (name) => normalizeTitle(name) === wanted,
  );
}

/**
 * Titel-Input für den Seed: deutsche Beschreibung, falls vorhanden. Als
 * Titel bleibt die Schreibweise des Vereins, wenn BGG sie als Haupt- oder
 * Alternativnamen kennt (meist der deutsche Name); der BGG-Hauptname wird
 * dann Zweittitel. Sonst gewinnt der BGG-Hauptname (korrigiert Tippfehler
 * der Tabelle).
 */
export function releaseTitleInput(
  clubTitle: string,
  game: ReleaseBoardGame,
  descriptionDe?: string,
): BoardGameTitleInput {
  const primary = game.input.title;
  const title =
    bggNameFor(clubTitle, {
      title: primary,
      alternateNames: game.alternateNames,
    }) ?? primary;
  return {
    ...game.input,
    title,
    secondaryTitle: title === primary ? null : primary,
    description: descriptionDe ?? game.input.description,
  };
}

/**
 * Bester bewerteter Kandidat: höchste Passung (`scoreCandidate`), bei
 * Gleichstand der bekannteste (meiste BGG-Bewertungen — sonst gewinnen
 * obskure gleichnamige Spiele), dann der älteste.
 */
export function pickBestCandidate<
  T extends { bggId: number; score: number; data: BggGameData },
>(scored: T[]): T | undefined {
  return [...scored].sort(
    (a, b) =>
      b.score - a.score ||
      (b.data.usersRated ?? 0) - (a.data.usersRated ?? 0) ||
      (a.data.yearPublished ?? Infinity) - (b.data.yearPublished ?? Infinity) ||
      a.bggId - b.bggId,
  )[0];
}

/** Deutsche Edition eines Titels (Sprache oder Verlag, siehe
 * `isGermanVersion`) — bei mehreren die, deren Name den Vereinstitel
 * enthält, sonst die neueste. */
export function pickGermanVersion(
  versions: BggVersion[],
  clubTitle: string,
): { version: VersionInput | null; pick: VersionPick } {
  const german = versions.filter(isGermanVersion);
  if (german.length === 0) return { version: null, pick: "none" };
  if (german.length === 1) {
    return { version: versionInputFromBgg(german[0]), pick: "single" };
  }
  const newest = (list: BggVersion[]) =>
    [...list].sort(
      (a, b) => (b.yearPublished ?? 0) - (a.yearPublished ?? 0),
    )[0];
  const named = german.filter((v) =>
    v.name?.toLowerCase().includes(clubTitle.toLowerCase()),
  );
  return named.length > 0
    ? { version: versionInputFromBgg(newest(named)), pick: "title" }
    : { version: versionInputFromBgg(newest(german)), pick: "latest" };
}

const EXPANSION_TITLE = /erweiterung|expansion|erw\./i;

/**
 * Wie gut ein BGG-Kandidat zu einem Vereinstitel passt: eine deutsche
 * Edition zählt am meisten, dann ein exakt passender (Alternativ-)Name,
 * dann Basisspiel vs. Erweiterung passend zum Titel.
 */
export function scoreCandidate(clubTitle: string, data: BggGameData) {
  const nameMatches = bggNameFor(clubTitle, data) !== undefined;
  const wantsExpansion = EXPANSION_TITLE.test(clubTitle);
  const isExpansion = data.kind === "BOARDGAME_EXPANSION";
  return (
    (data.versions.some(isGermanVersion) ? 4 : 0) +
    (nameMatches ? 2 : 0) +
    (wantsExpansion === isExpansion ? 1 : 0)
  );
}

/** Datensatz für `release-board-games.json` aus BGG-Rohdaten. */
export function toReleaseBoardGame(
  bggId: number,
  data: BggGameData,
  clubTitle: string,
): ReleaseBoardGame {
  // Ohne Edition — die gewählte deutsche Edition steht separat in `version`.
  const input = bggDataToTitleInput(bggId, data);
  delete input.version;
  const { version, pick } = pickGermanVersion(data.versions, clubTitle);
  return {
    input,
    alternateNames: data.alternateNames,
    version,
    versionPick: pick,
  };
}
