import type { Prisma, PrismaClient, TagType } from "@prisma/client";
import type { BggGameData } from "@/lib/bgg/client";
import { upsertTaxonomyEntry } from "@/lib/ludothek/taxonomy/upsert";

type Tx = PrismaClient | Prisma.TransactionClient;

export type TagInput = {
  type: TagType;
  bggId: number | null;
  name: string;
};

/** Findet oder legt eine Mechanik/Kategorie an, Regel siehe
 * `upsertTaxonomyEntry`. Der `dedupKey` trägt den Typ als Präfix, weil BGG-IDs
 * nur je Typ eindeutig sind. */
export async function upsertTag(tx: Tx, input: TagInput) {
  return upsertTaxonomyEntry(
    {
      findByDedupKey: (dedupKey) => tx.tag.findUnique({ where: { dedupKey } }),
      findByNormalizedName: (normalizedName) =>
        tx.tag.findFirst({
          where: { type: input.type, normalizedName },
          orderBy: { bggId: "asc" },
        }),
      attachBggId: (id, data) => tx.tag.update({ where: { id }, data }),
      create: (data) => tx.tag.create({ data: { ...data, type: input.type } }),
    },
    { bggId: input.bggId, name: input.name, prefix: input.type },
  );
}

export async function linkTags(
  tx: Tx,
  boardGameId: string,
  inputs: TagInput[],
) {
  if (inputs.length === 0) return;

  const links: { boardGameId: string; tagId: string }[] = [];
  for (const input of inputs) {
    const tag = await upsertTag(tx, input);
    links.push({ boardGameId, tagId: tag.id });
  }

  await tx.boardGameTag.createMany({ data: links, skipDuplicates: true });
}

/** Ersetzt alle Tags eines Titels durch die aus BGG gelieferten. */
export async function replaceBggTags(
  tx: Tx,
  boardGameId: string,
  inputs: TagInput[],
) {
  await tx.boardGameTag.deleteMany({ where: { boardGameId } });
  await linkTags(tx, boardGameId, inputs);
}

/**
 * Ersetzt die Tags eines Typs anhand der Anzeigenamen aus dem Editor. Ein
 * Label passt auf `displayName` (case-insensitiv) oder `name` eines
 * vorhandenen Tags dieses Typs, sonst entsteht ein Tag ohne BGG-ID mit
 * `name = label`.
 * Spiegelbild zu `replaceAuthorIllustratorLinksByName`.
 */
export async function replaceTagsByLabel(
  tx: Tx,
  boardGameId: string,
  type: TagType,
  labels: string[],
) {
  await tx.boardGameTag.deleteMany({ where: { boardGameId, tag: { type } } });

  for (const label of labels) {
    const existing = await tx.tag.findFirst({
      where: {
        type,
        displayName: { equals: label.trim(), mode: "insensitive" },
      },
      orderBy: { bggId: "asc" },
    });
    const tag =
      existing ?? (await upsertTag(tx, { type, bggId: null, name: label }));
    await tx.boardGameTag.createMany({
      data: [{ boardGameId, tagId: tag.id }],
      skipDuplicates: true,
    });
  }
}

/** Mechaniken und Kategorien aus einer BGG-Vorschau als Tag-Eingaben. */
export function bggTagInputs(preview: BggGameData | null): TagInput[] {
  if (!preview) return [];
  return [
    ...preview.mechanicLinks.map((link) => ({
      type: "MECHANIC" as const,
      ...link,
    })),
    ...preview.categoryLinks.map((link) => ({
      type: "CATEGORY" as const,
      ...link,
    })),
  ];
}

/** Mechaniken und Kategorien eines Titels über ihre Anzeigenamen ersetzen —
 * für Editor-Speichern und Anlage ohne BGG-Links. */
export async function replaceTitleTagsByLabel(
  tx: Tx,
  boardGameId: string,
  labels: { mechanics: string[]; categories: string[] },
) {
  await replaceTagsByLabel(tx, boardGameId, "MECHANIC", labels.mechanics);
  await replaceTagsByLabel(tx, boardGameId, "CATEGORY", labels.categories);
}
