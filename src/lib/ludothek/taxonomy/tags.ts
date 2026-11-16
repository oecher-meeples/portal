import type { Prisma, PrismaClient, TagType } from "@prisma/client";
import type { BggGameData } from "@/lib/bgg/client";
import {
  normalizeTaxonomyName,
  taxonomyDedupKey,
} from "@/lib/ludothek/taxonomy/normalize";
import { tagLabel } from "@/lib/ludothek/taxonomy/tags-read";
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

/**
 * Anzeigenamen der Mechaniken/Kategorien einer BGG-Vorschau aus dem Register:
 * Treffer über Typ + BGG-ID, sonst über Typ + normalisierten Namen; ein
 * unbekannter Tag zeigt den BGG-Namen. Reihenfolge wie bei BGG. Ersetzt die
 * frühere feste Übersetzungstabelle in Import-Vorschau und BGG-Abgleich.
 */
export async function resolveBggTagLabels(tx: Tx, data: BggGameData) {
  const inputs = bggTagInputs(data);
  if (inputs.length === 0) return { mechanics: [], categories: [] };

  const known = await tx.tag.findMany({
    where: {
      OR: [
        {
          dedupKey: {
            in: inputs.flatMap((input) =>
              input.bggId === null
                ? []
                : [taxonomyDedupKey(input.bggId, "", input.type)],
            ),
          },
        },
        {
          normalizedName: {
            in: inputs.map((input) => normalizeTaxonomyName(input.name)),
          },
        },
      ],
    },
    select: {
      type: true,
      bggId: true,
      name: true,
      normalizedName: true,
      displayName: true,
    },
  });

  const labelFor = (input: TagInput) => {
    const sameType = known.filter((tag) => tag.type === input.type);
    const match =
      (input.bggId !== null &&
        sameType.find((tag) => tag.bggId === input.bggId)) ||
      sameType.find(
        (tag) => tag.normalizedName === normalizeTaxonomyName(input.name),
      );
    return match ? tagLabel(match) : input.name;
  };

  return {
    mechanics: inputs.filter((i) => i.type === "MECHANIC").map(labelFor),
    categories: inputs.filter((i) => i.type === "CATEGORY").map(labelFor),
  };
}
