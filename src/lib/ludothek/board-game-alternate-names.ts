"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";

async function revalidateTitlePaths(boardGameId: string) {
  const game = await prisma.boardGame.findUnique({
    where: { id: boardGameId },
    select: { slug: true },
  });
  revalidatePath("/admin/bestand");
  revalidatePath("/ludothek");
  if (game) revalidatePath(`/ludothek/${game.slug}`);
}

/** Manuell einen weiteren Namen für einen Titel anlegen (#187) — neben der
 * automatischen Befüllung aus BGGs `name type="alternate"` beim Import. */
export async function addAlternateName(
  boardGameId: string,
  name: string,
  note?: string | null,
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Bitte einen Namen angeben." };
  }

  await prisma.boardGameAlternateName.create({
    data: { boardGameId, name: trimmedName, note: note?.trim() || null },
  });

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/** Löscht einen Alternativnamen. War er als Sekundärname markiert, setzt die
 * DB `BoardGame.secondaryAlternateNameId` selbst auf `null` (`ON DELETE SET
 * NULL`, siehe Migration) — kein zusätzlicher Schritt hier nötig (#187). */
export async function deleteAlternateName(id: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const deleted = await prisma.boardGameAlternateName.delete({
    where: { id },
  });

  await revalidateTitlePaths(deleted.boardGameId);
  return { success: true as const };
}

/**
 * "Als Hauptname übernehmen" (#187): tauscht nur die WERTE zwischen
 * `BoardGame.title` und der gewählten Alternativnamen-Zeile — die Zeile
 * selbst bleibt bestehen (jetzt mit dem alten Titel als Wert), `slug` bleibt
 * unverändert (an den ursprünglichen Anlege-Titel gebunden, siehe Kommentar
 * "Routing basis" in `schema.prisma`), damit keine URLs brechen.
 */
export async function promoteAlternateNameToTitle(alternateNameId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const boardGameId = await prisma.$transaction(async (tx) => {
    const alternateName = await tx.boardGameAlternateName.findUnique({
      where: { id: alternateNameId },
      include: { boardGame: { select: { id: true, title: true } } },
    });
    if (!alternateName) return null;

    await tx.boardGame.update({
      where: { id: alternateName.boardGame.id },
      data: { title: alternateName.name },
    });
    await tx.boardGameAlternateName.update({
      where: { id: alternateNameId },
      data: { name: alternateName.boardGame.title },
    });

    return alternateName.boardGame.id;
  });

  if (!boardGameId) {
    return { error: "Alternativname wurde nicht gefunden." };
  }

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/**
 * Markiert (oder entfernt, bei `alternateNameId: null`) den einen
 * Alternativnamen, der neben `title` angezeigt wird (#187) — greift über
 * `BoardGame.secondaryAlternateNameId` (unique), es kann also immer nur eine
 * Zeile je Titel markiert sein.
 */
export async function markAsSecondaryAlternateName(
  boardGameId: string,
  alternateNameId: string | null,
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  if (alternateNameId) {
    const alternateName = await prisma.boardGameAlternateName.findUnique({
      where: { id: alternateNameId },
      select: { boardGameId: true },
    });
    if (!alternateName || alternateName.boardGameId !== boardGameId) {
      return { error: "Dieser Alternativname gehört nicht zu diesem Titel." };
    }
  }

  await prisma.boardGame.update({
    where: { id: boardGameId },
    data: { secondaryAlternateNameId: alternateNameId },
  });

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/** Lädt die Alternativnamen-Liste plus die aktuelle Sekundärname-Markierung
 * für den Titel-Editor (#187). */
export async function listAlternateNames(boardGameId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const [alternateNames, boardGame] = await Promise.all([
    prisma.boardGameAlternateName.findMany({
      where: { boardGameId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, note: true },
    }),
    prisma.boardGame.findUnique({
      where: { id: boardGameId },
      select: { secondaryAlternateNameId: true },
    }),
  ]);

  return {
    success: true as const,
    alternateNames,
    secondaryAlternateNameId: boardGame?.secondaryAlternateNameId ?? null,
  };
}
