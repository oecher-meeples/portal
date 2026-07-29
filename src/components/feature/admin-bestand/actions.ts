"use server";

import { GameInventoryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/permissions";
import { isValidEan, normaliseEan } from "@/lib/inventory/ean";
import { ensureMeeple } from "@/lib/meeples";
import { ensureUnsortiertUnit } from "@/lib/ludothek/holdings";
import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  type BggGameData,
} from "@/lib/bgg/client";

export type BoardGameInput = {
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
  condition?: string | null;
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (
    await prisma.boardGame.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function validateBoardGameInput(input: BoardGameInput) {
  if (!input.title) {
    return "Bitte einen Titel angeben.";
  }
  if (input.ean && !isValidEan(input.ean)) {
    return "Diese EAN ist ungültig. Bitte die Prüfziffer kontrollieren.";
  }
  return null;
}

function toBoardGameData(input: BoardGameInput) {
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
    condition: input.condition || null,
  };
}

/** Duplicate EANs are allowed by design (ADR 0001) — surfaced only as a hint. */
async function duplicateEanHint(ean: string | null | undefined, excludeId?: string) {
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

async function requireGamesManagePermission() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "games:manage"))) {
    return null;
  }
  return user;
}

export async function createBoardGame(input: BoardGameInput) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validateBoardGameInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const [slug, hint, actor] = await Promise.all([
    uniqueSlug(input.title),
    duplicateEanHint(input.ean),
    ensureMeeple(user),
  ]);

  const game = await prisma.$transaction(async (tx) => {
    const created = await tx.boardGame.create({
      data: { slug, title: input.title, ...toBoardGameData(input) },
    });

    const unsortiert = await ensureUnsortiertUnit(tx);
    await tx.gameHolding.create({
      data: {
        boardGameId: created.id,
        unitId: unsortiert.id,
        origin: "INITIAL",
        confirmedAt: new Date(),
        recordedByMeepleId: actor.id,
      },
    });

    return created;
  });

  return { success: true as const, id: game.id, hint };
}

export async function updateBoardGame(id: string, input: BoardGameInput) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validateBoardGameInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const [slug, hint] = await Promise.all([
    uniqueSlug(input.title, id),
    duplicateEanHint(input.ean, id),
  ]);

  await prisma.boardGame.update({
    where: { id },
    data: { slug, title: input.title, ...toBoardGameData(input) },
  });

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
        error: "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }
}

export async function deinventoriseBoardGame(id: string, reason: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  if (!reason.trim()) {
    return { error: "Bitte einen Grund für die Deinventarisierung angeben." };
  }

  await prisma.boardGame.update({
    where: { id },
    data: {
      status: GameInventoryStatus.DEINVENTARISED,
      archivedAt: new Date(),
      archivedReason: reason.trim(),
    },
  });

  return { success: true as const };
}

export async function requestCompletenessCheck(id: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.boardGame.update({
    where: { id },
    data: { needsCompletenessCheck: true },
  });

  return { success: true as const };
}
