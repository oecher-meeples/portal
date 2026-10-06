import type { ContributorRole, Prisma, PrismaClient } from "@prisma/client";
import {
  normalizeTaxonomyName,
  taxonomyDedupKey,
} from "@/lib/ludothek/taxonomy/normalize";

type Tx = PrismaClient | Prisma.TransactionClient;

export type ContributorInput = {
  role: ContributorRole;
  bggId: number | null;
  name: string;
};

/**
 * Findet oder legt einen Mitwirkenden an. Ein Eintrag mit BGG-ID wird über
 * `bggId` gefunden. Ein bisher namensbasierter Eintrag (ohne BGG-ID) mit
 * gleichem Namen bekommt die BGG-ID nachträglich und wird dabei umgeschrieben.
 */
export async function upsertContributor(tx: Tx, input: ContributorInput) {
  const normalizedName = normalizeTaxonomyName(input.name);
  const dedupKey = taxonomyDedupKey(input.bggId, normalizedName);

  const byKey = await tx.contributor.findUnique({ where: { dedupKey } });
  if (byKey) return byKey;

  if (input.bggId !== null) {
    const byName = await tx.contributor.findUnique({
      where: { dedupKey: taxonomyDedupKey(null, normalizedName) },
    });
    if (byName) {
      return tx.contributor.update({
        where: { id: byName.id },
        data: { bggId: input.bggId, dedupKey, name: input.name },
      });
    }
  }

  return tx.contributor.create({
    data: {
      dedupKey,
      name: input.name,
      normalizedName,
      bggId: input.bggId,
    },
  });
}

export async function linkContributors(
  tx: Tx,
  boardGameId: string,
  inputs: ContributorInput[],
) {
  if (inputs.length === 0) return;

  const links: {
    boardGameId: string;
    contributorId: string;
    role: ContributorRole;
  }[] = [];
  for (const input of inputs) {
    const contributor = await upsertContributor(tx, input);
    links.push({
      boardGameId,
      contributorId: contributor.id,
      role: input.role,
    });
  }

  await tx.boardGameContributor.createMany({
    data: links,
    skipDuplicates: true,
  });
}
