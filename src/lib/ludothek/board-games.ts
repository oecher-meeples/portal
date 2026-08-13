"use server";

import { revalidatePath } from "next/cache";
import { BoardGameKind, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { isValidEan, normaliseEan } from "@/lib/inventory/ean";
import { ensureMeeple } from "@/lib/members/meeples";
import { createGameCopyTx } from "@/lib/ludothek/game-copies";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  type BggGameData,
} from "@/lib/bgg/client";
import { uniqueSlug } from "@/lib/utils/slug";

type Tx = PrismaClient | Prisma.TransactionClient;

export type BoardGameTitleInput = {
  title: string;
  bggId?: number | null;
  ean?: string | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  playTimeMinutes?: number | null;
  weight?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  mechanics?: string[];
  explainerVideoUrl?: string | null;
  /** Manual override until the BGG import (blocked by #12) can set this reliably — see #30. */
  kind?: BoardGameKind;
};

export type CreateBoardGameInput = BoardGameTitleInput & {
  condition?: string | null;
};

function validateBoardGameInput(input: BoardGameTitleInput) {
  if (!input.title) {
    return "Bitte einen Titel angeben.";
  }
  if (input.ean && !isValidEan(input.ean)) {
    return "Diese EAN ist ungültig. Bitte die Prüfziffer kontrollieren.";
  }
  return null;
}

function toBoardGameTitleData(input: BoardGameTitleInput) {
  return {
    bggId: input.bggId ?? null,
    ean: input.ean ? normaliseEan(input.ean) : null,
    minPlayers: input.minPlayers ?? null,
    maxPlayers: input.maxPlayers ?? null,
    playTimeMinutes: input.playTimeMinutes ?? null,
    weight: input.weight ?? null,
    imageUrl: input.imageUrl || null,
    description: input.description || null,
    mechanics: input.mechanics ?? [],
    explainerVideoUrl: input.explainerVideoUrl || null,
    ...(input.kind ? { kind: input.kind } : {}),
  };
}

/** Duplicate EANs are allowed by design (ADR 0001) — surfaced only as a hint. */
async function duplicateEanHint(
  ean: string | null | undefined,
  excludeId?: string,
) {
  if (!ean) return undefined;

  const count = await prisma.boardGame.count({
    where: {
      ean: normaliseEan(ean),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  return count > 0
    ? "Diese EAN ist bereits einem anderen Spiel zugeordnet — das ist bei mehreren Exemplaren desselben Titels normal."
    : undefined;
}

/** Every title touched by an expansion assignment, revalidated via its own route. */
async function revalidateAssignmentPaths(
  baseGameId: string,
  expansionId: string,
) {
  const games = await prisma.boardGame.findMany({
    where: { id: { in: [baseGameId, expansionId] } },
    select: { slug: true },
  });

  revalidatePath("/ludothek");
  for (const game of games) {
    revalidatePath(`/ludothek/${game.slug}`);
  }
}

export async function uniqueBoardGameSlug(tx: Tx, title: string) {
  return uniqueSlug(
    title,
    async (slug) =>
      (await tx.boardGame.findFirst({
        where: { slug },
        select: { id: true },
      })) !== null,
  );
}

/** Finds the title by `bggId` (the one reliable product identity) or creates it. */
export async function findOrCreateBoardGameTitle(
  input: BoardGameTitleInput,
  tx: Tx = prisma,
) {
  if (input.bggId) {
    const existing = await tx.boardGame.findUnique({
      where: { bggId: input.bggId },
    });
    if (existing) return existing;
  }

  const slug = await uniqueBoardGameSlug(tx, input.title);
  return tx.boardGame.create({
    data: { title: input.title, slug, ...toBoardGameTitleData(input) },
  });
}

/** New title + its first physical copy, in one transaction. */
export async function createBoardGame(input: CreateBoardGameInput) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validateBoardGameInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const [hint, actor] = await Promise.all([
    duplicateEanHint(input.ean),
    ensureMeeple(user),
  ]);

  const copy = await prisma.$transaction(async (tx) => {
    const title = await findOrCreateBoardGameTitle(input, tx);
    return createGameCopyTx(tx, {
      boardGameId: title.id,
      boardGameTitle: title.title,
      condition: input.condition,
      actorId: actor.id,
    });
  });

  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  return { success: true as const, id: copy.id, hint };
}

export async function updateBoardGame(id: string, input: BoardGameTitleInput) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validateBoardGameInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const hint = await duplicateEanHint(input.ean, id);

  const game = await prisma.boardGame.update({
    where: { id },
    data: { title: input.title, ...toBoardGameTitleData(input) },
  });

  revalidatePath("/ludothek");
  revalidatePath(`/ludothek/${game.slug}`);
  revalidatePath("/admin/bestand");
  return { success: true as const, hint };
}

export async function previewBggImport(bggId: number) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  try {
    const data: BggGameData = await fetchBggGame(bggId);
    return { success: true as const, data };
  } catch (error) {
    if (error instanceof BggNotFoundError) {
      return { success: false as const, error: error.message };
    }
    if (error instanceof BggApiError) {
      return {
        success: false as const,
        error:
          "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }
}

/** Manual base game ↔ expansion assignment, see #30 — BGG import is blocked by #12. */
export async function assignExpansion(baseGameId: string, expansionId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  if (baseGameId === expansionId) {
    return { error: "Ein Spiel kann nicht seine eigene Erweiterung sein." };
  }

  await prisma.gameCollection.upsert({
    where: { baseGameId_expansionId: { baseGameId, expansionId } },
    update: {},
    create: { baseGameId, expansionId },
  });

  // The assigned title is an expansion by definition — set `kind` if the
  // BGG import didn't already (no fallback on removal, see #30).
  await prisma.boardGame.updateMany({
    where: { id: expansionId, kind: { not: BoardGameKind.BOARDGAME_EXPANSION } },
    data: { kind: BoardGameKind.BOARDGAME_EXPANSION },
  });

  await revalidateAssignmentPaths(baseGameId, expansionId);
  return { success: true as const };
}

/**
 * Candidate titles for the assignment dialog (#30): base-game candidates
 * (`gameKind` is an expansion) must themselves be a BOARDGAME; expansion
 * candidates (game is a base game) can be any kind — BGG import is blocked
 * (#12), so `kind` isn't reliably set on every title yet.
 */
export async function findExpansionAssignmentOptions(
  gameKind: BoardGameKind,
  excludeIds: string[],
) {
  const isExpansion = gameKind === BoardGameKind.BOARDGAME_EXPANSION;

  return prisma.boardGame.findMany({
    where: {
      id: { notIn: excludeIds },
      ...(isExpansion ? { kind: BoardGameKind.BOARDGAME } : {}),
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function removeExpansionAssignment(
  baseGameId: string,
  expansionId: string,
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.gameCollection.deleteMany({
    where: { baseGameId, expansionId },
  });

  await revalidateAssignmentPaths(baseGameId, expansionId);
  return { success: true as const };
}
