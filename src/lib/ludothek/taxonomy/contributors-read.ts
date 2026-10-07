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

/** Namen je Rolle, alphabetisch sortiert und ohne Dubletten (Co-Publisher mit
 * gleichem Namen). */
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
    publisher: namesFor("PUBLISHER"),
    author: namesFor("AUTHOR"),
    illustrator: namesFor("ILLUSTRATOR"),
  };
}
