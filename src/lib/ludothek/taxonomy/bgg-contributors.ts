import type { BggGameData } from "@/lib/bgg/client";
import type { ContributorInput } from "@/lib/ludothek/taxonomy/contributors";

/**
 * Mitwirkende aus einer BGG-Vorschau. Verlage stammen aus der Edition, deren
 * Verlagsname dem aktuellen Textfeld entspricht — so bleiben die BGG-IDs der
 * gewählten Edition erhalten, auch wenn der Admin eine andere Edition nimmt.
 */
export function bggContributorInputs(
  preview: BggGameData | null,
  publisherText: string,
): ContributorInput[] {
  if (!preview) return [];

  const publisherVersion = preview.versions.find(
    (version) => version.publisher.join(", ") === publisherText,
  );
  const publishers: ContributorInput[] = (
    publisherVersion?.publisherLinks ?? []
  ).map((link) => ({ role: "PUBLISHER", bggId: link.bggId, name: link.name }));
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

  return [...publishers, ...authors, ...illustrators];
}
