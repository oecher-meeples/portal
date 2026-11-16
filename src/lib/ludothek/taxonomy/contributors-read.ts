import type { ContributorRole } from "@prisma/client";

/** Prisma-`include` für die Mitwirkenden eines Titels — überall gleich, damit
 * Lese-Pfade dieselben Namen liefern. */
export const CONTRIBUTOR_LINKS_INCLUDE = {
  select: {
    role: true,
    contributor: { select: { name: true } },
  },
} as const;

export type ContributorLinkRow = {
  role: ContributorRole;
  contributor: { name: string };
};

/** Autoren und Illustratoren, alphabetisch sortiert und ohne Dubletten.
 * Verlage hängen an der Edition (`versionDisplay()`), nicht am Titel. */
export function contributorNamesByRole(links: ContributorLinkRow[]) {
  const namesFor = (role: ContributorRole) =>
    [
      ...new Set(
        links
          .filter((link) => link.role === role)
          .map((link) => link.contributor.name),
      ),
    ].sort((a, b) => a.localeCompare(b, "de"));

  return {
    author: namesFor("AUTHOR"),
    illustrator: namesFor("ILLUSTRATOR"),
  };
}

/** Prisma-`select` der Edition eines Exemplars/Privateintrags — Verlage und
 * Sprachen für die Anzeige. */
export const VERSION_DISPLAY_SELECT = {
  select: {
    languages: true,
    publishers: { select: { contributor: { select: { name: true } } } },
  },
} as const;

export type VersionDisplayRow = {
  languages: string[];
  publishers: { contributor: { name: string } }[];
} | null;

/** Verlage (alphabetisch) und BGG-Sprachnamen einer Edition; ohne Edition
 * bleiben beide leer. */
export function versionDisplay(version: VersionDisplayRow) {
  return {
    publisher: version
      ? version.publishers
          .map((p) => p.contributor.name)
          .sort((a, b) => a.localeCompare(b, "de"))
      : [],
    editionLanguages: version?.languages ?? [],
  };
}
