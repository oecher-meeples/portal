"use server";

import { GameInventoryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/permissions";
import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  type BggGameData,
} from "@/lib/bgg/client";

export type BoardGameInput = {
  title: string;
  bggId?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  playTimeMinutes?: number | null;
  weight?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  mechanics?: string[];
  quantity: number;
  location?: string | null;
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
  if (!input.quantity || input.quantity < 1) {
    return "Anzahl der Exemplare muss mindestens 1 sein.";
  }
  return null;
}

function toBoardGameData(input: BoardGameInput) {
  return {
    bggId: input.bggId ?? null,
    minPlayers: input.minPlayers ?? null,
    maxPlayers: input.maxPlayers ?? null,
    playTimeMinutes: input.playTimeMinutes ?? null,
    weight: input.weight ?? null,
    imageUrl: input.imageUrl || null,
    description: input.description || null,
    mechanics: input.mechanics ?? [],
    quantity: input.quantity,
    location: input.location || null,
    condition: input.condition || null,
  };
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

  if (input.bggId) {
    const existing = await prisma.boardGame.findUnique({
      where: { bggId: input.bggId },
      select: { id: true },
    });
    if (existing) {
      return { error: "Spiel mit dieser BGG-ID existiert bereits." };
    }
  }

  const slug = await uniqueSlug(input.title);
  const game = await prisma.boardGame.create({
    data: { slug, title: input.title, ...toBoardGameData(input) },
  });

  return { success: true as const, id: game.id };
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

  if (input.bggId) {
    const existing = await prisma.boardGame.findUnique({
      where: { bggId: input.bggId },
      select: { id: true },
    });
    if (existing && existing.id !== id) {
      return { error: "Spiel mit dieser BGG-ID existiert bereits." };
    }
  }

  const slug = await uniqueSlug(input.title, id);
  await prisma.boardGame.update({
    where: { id },
    data: { slug, title: input.title, ...toBoardGameData(input) },
  });

  return { success: true as const };
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
