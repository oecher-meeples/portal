import type { TagType } from "@prisma/client";

/** Prisma-`include` für die Tags eines Titels — überall gleich, damit
 * Lese-Pfade dieselben Anzeigenamen liefern. */
export const TAG_LINKS_INCLUDE = {
  select: {
    tag: { select: { type: true, name: true, displayName: true } },
  },
} as const;

export type TagLinkRow = {
  tag: { type: TagType; name: string; displayName: string | null };
};

/** Anzeigename eines Tags: der gepflegte deutsche `displayName`, sonst der
 * BGG-Originalname. */
export function tagLabel(tag: TagLinkRow["tag"]): string {
  return tag.displayName?.trim() || tag.name;
}

/** Mechaniken und Kategorien als Anzeigenamen, alphabetisch sortiert und
 * ohne Dubletten. Muster wie `contributorNamesByRole`. */
export function tagLabelsByType(links: TagLinkRow[]) {
  const labelsFor = (type: TagType) =>
    [
      ...new Set(
        links
          .filter((link) => link.tag.type === type)
          .map((link) => tagLabel(link.tag)),
      ),
    ].sort((a, b) => a.localeCompare(b, "de"));

  return {
    mechanics: labelsFor("MECHANIC"),
    categories: labelsFor("CATEGORY"),
  };
}

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  MECHANIC: "Mechanik",
  CATEGORY: "Kategorie",
};
