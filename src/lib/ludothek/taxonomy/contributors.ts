import type { ContributorRole } from "@prisma/client";
import { normalizeTaxonomyName } from "@/lib/ludothek/taxonomy/normalize";
import { upsertTaxonomyEntry } from "@/lib/ludothek/taxonomy/upsert";

import type { DbClient } from "@/lib/utils/prisma";

type Tx = DbClient;

export type ContributorInput = {
  role: ContributorRole;
  bggId: number | null;
  name: string;
};

/** Findet oder legt einen Mitwirkenden an, Regel siehe `upsertTaxonomyEntry`. */
export async function upsertContributor(tx: Tx, input: ContributorInput) {
  return upsertTaxonomyEntry(
    {
      findByDedupKey: (dedupKey) =>
        tx.contributor.findUnique({ where: { dedupKey } }),
      attachBggId: (id, data) => tx.contributor.update({ where: { id }, data }),
      create: (data) => tx.contributor.create({ data }),
    },
    input,
  );
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

export async function replaceAuthorIllustratorLinksByName(
  tx: Tx,
  boardGameId: string,
  names: { author: string[]; illustrator: string[] },
) {
  const inputs: ContributorInput[] = [
    ...names.author.map((name) => ({
      role: "AUTHOR" as const,
      bggId: null,
      name,
    })),
    ...names.illustrator.map((name) => ({
      role: "ILLUSTRATOR" as const,
      bggId: null,
      name,
    })),
  ];

  await tx.boardGameContributor.deleteMany({
    where: {
      boardGameId,
      role: { in: ["AUTHOR", "ILLUSTRATOR"] },
    },
  });

  for (const input of inputs) {
    const existing = await tx.contributor.findFirst({
      where: { normalizedName: normalizeTaxonomyName(input.name) },
      orderBy: { bggId: "asc" },
    });
    const contributor = existing ?? (await upsertContributor(tx, input));
    await tx.boardGameContributor.createMany({
      data: [{ boardGameId, contributorId: contributor.id, role: input.role }],
      skipDuplicates: true,
    });
  }
}

export async function replaceBggContributors(
  tx: Tx,
  boardGameId: string,
  inputs: ContributorInput[],
) {
  await tx.boardGameContributor.deleteMany({ where: { boardGameId } });
  await linkContributors(tx, boardGameId, inputs);
}
