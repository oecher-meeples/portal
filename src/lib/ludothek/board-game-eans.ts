import { Prisma } from "@prisma/client";
import { isValidEan, normaliseEan } from "@/lib/inventory/ean";
import { EanConflictError } from "@/lib/ludothek/errors";
import { prisma, type DbClient } from "@/lib/utils/prisma";

/** Where-Fragment für jeden Titel-Lookup über eine EAN — gleichgültig, welche seiner EANs. */
export function eanWhere(ean: string) {
  return { eans: { some: { ean: normaliseEan(ean) } } };
}

export type NormalisedEans = { eans: string[]; invalid: string[] };

/** Normalisiert, validiert und dedupliziert; ungültige Eingaben landen in `invalid`. */
export function normaliseAndValidateEans(
  raw: readonly string[] | null | undefined,
): NormalisedEans {
  const eans = new Set<string>();
  const invalid: string[] = [];
  for (const value of raw ?? []) {
    const ean = normaliseEan(value);
    if (!ean) continue;
    if (isValidEan(ean)) eans.add(ean);
    else invalid.push(value.trim());
  }
  return { eans: [...eans], invalid };
}

export async function findBoardGameByEan(ean: string, tx: DbClient = prisma) {
  return tx.boardGame.findFirst({
    where: eanWhere(ean),
    select: { id: true, title: true, slug: true },
  });
}

/** Wirft `EanConflictError` mit dem Besitzer-Titel, sobald eine EAN zu einem anderen Titel gehört. */
export async function assertEansAvailable(
  eans: readonly string[],
  excludeBoardGameId?: string,
  tx: DbClient = prisma,
) {
  if (eans.length === 0) return;
  const owner = await tx.boardGameEan.findFirst({
    where: {
      ean: { in: [...eans] },
      ...(excludeBoardGameId
        ? { boardGameId: { not: excludeBoardGameId } }
        : {}),
    },
    select: { ean: true, boardGame: { select: { title: true } } },
  });
  if (owner) throw new EanConflictError(owner.ean, owner.boardGame.title);
}

/** Race condition: the DB unique constraint beat `assertEansAvailable` — surface the same error. */
export async function rethrowEanConflict(
  error: unknown,
  eans: readonly string[],
  excludeBoardGameId?: string,
): Promise<never> {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    await assertEansAvailable(eans, excludeBoardGameId);
    throw new EanConflictError(eans[0] ?? "");
  }
  throw error;
}

/** Makes `eans` the exact EAN set of the title (create, update with add/remove). */
export async function replaceBoardGameEans(
  tx: DbClient,
  boardGameId: string,
  eans: readonly string[],
) {
  await assertEansAvailable(eans, boardGameId, tx);
  await tx.boardGameEan.deleteMany({
    where: { boardGameId, ean: { notIn: [...eans] } },
  });
  const existing = await tx.boardGameEan.findMany({
    where: { boardGameId },
    select: { ean: true },
  });
  const have = new Set(existing.map((row) => row.ean));
  const missing = eans.filter((ean) => !have.has(ean));
  if (missing.length > 0) {
    await tx.boardGameEan.createMany({
      data: missing.map((ean) => ({ boardGameId, ean })),
    });
  }
}

/** Adds EANs without removing the existing ones (re-use of a known title). */
export async function addBoardGameEans(
  tx: DbClient,
  boardGameId: string,
  eans: readonly string[],
) {
  if (eans.length === 0) return;
  await assertEansAvailable(eans, boardGameId, tx);
  await tx.boardGameEan.createMany({
    data: eans.map((ean) => ({ boardGameId, ean })),
    skipDuplicates: true,
  });
}
