import type { TagType } from "@prisma/client";
import { sortedUniqueLabels } from "@/lib/utils/sorted-unique";

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
    sortedUniqueLabels(
      links,
      (link) => link.tag.type === type,
      (link) => tagLabel(link.tag),
    );

  return {
    mechanics: labelsFor("MECHANIC"),
    categories: labelsFor("CATEGORY"),
  };
}

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  MECHANIC: "Mechanik",
  CATEGORY: "Kategorie",
};

export const TAG_TYPE_PLURAL_LABELS: Record<TagType, string> = {
  MECHANIC: "Mechaniken",
  CATEGORY: "Kategorien",
};
