import type { BggGameData } from "@/lib/bgg/client";
import type { ContributorInput } from "@/lib/ludothek/taxonomy/contributors";

/**
 * Autoren und Illustratoren aus einer BGG-Vorschau — beide gelten für das
 * ganze Spiel. Verlage hängen an der Edition (`VersionInput`), nicht hier.
 */
export function bggContributorInputs(
  preview: BggGameData | null,
): ContributorInput[] {
  if (!preview) return [];

  const authors: ContributorInput[] = preview.designers.map((link) => ({
    role: "AUTHOR",
    bggId: link.bggId,
    name: link.name,
  }));
  const illustrators: ContributorInput[] = preview.illustrators.map((link) => ({
    role: "ILLUSTRATOR",
    bggId: link.bggId,
    name: link.name,
  }));

  return [...authors, ...illustrators];
}
