"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";

/**
 * Gemeinsames Verschiebe-oder-Löschen-Muster hinter den "Als … verwenden"-
 * Aktionen unten: der alte Wert eines Titel-Felds landet in der Alternativ-
 * namen-Zeile, aus der der neue Wert kam. Gab es vorher gar keinen Wert
 * (`previousValue` leer), gibt es nichts zurückzutauschen — die Zeile wird
 * dann gelöscht statt eine leere Zeile zu hinterlassen (#263).
 */
async function replaceOrDeleteAlternateName(
  tx: Prisma.TransactionClient,
  alternateNameId: string,
  previousValue: string | null,
) {
  if (previousValue) {
    await tx.boardGameAlternateName.update({
      where: { id: alternateNameId },
      data: { name: previousValue },
    });
  } else {
    await tx.boardGameAlternateName.delete({ where: { id: alternateNameId } });
  }
}

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

/** Löscht einen Alternativnamen (#187). */
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
 * "Als Hauptname übernehmen" (#187): setzt `BoardGame.title` auf den Wert
 * der gewählten Alternativnamen-Zeile. `slug` bleibt unverändert (an den
 * ursprünglichen Anlege-Titel gebunden, siehe Kommentar "Routing basis" in
 * `schema.prisma`), damit keine URLs brechen.
 *
 * War noch kein Sekundärtitel gesetzt, wird der bisherige Haupttitel dorthin
 * verschoben statt in die Alternativtitel-Liste zurückzuwandern (#263) — war
 * bereits einer gesetzt, bleibt er unangetastet und der alte Haupttitel
 * landet wie bisher als Alternativtitel-Eintrag.
 */
export async function promoteAlternateNameToTitle(alternateNameId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const boardGameId = await prisma.$transaction(async (tx) => {
    const alternateName = await tx.boardGameAlternateName.findUnique({
      where: { id: alternateNameId },
      include: {
        boardGame: { select: { id: true, title: true, secondaryTitle: true } },
      },
    });
    if (!alternateName) return null;

    const oldTitle = alternateName.boardGame.title;
    if (alternateName.boardGame.secondaryTitle) {
      await tx.boardGame.update({
        where: { id: alternateName.boardGame.id },
        data: { title: alternateName.name },
      });
      await replaceOrDeleteAlternateName(tx, alternateNameId, oldTitle);
    } else {
      await tx.boardGame.update({
        where: { id: alternateName.boardGame.id },
        data: { title: alternateName.name, secondaryTitle: oldTitle },
      });
      await replaceOrDeleteAlternateName(tx, alternateNameId, null);
    }

    return alternateName.boardGame.id;
  });

  if (!boardGameId) {
    return { error: "Alternativname wurde nicht gefunden." };
  }

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/**
 * "Als Sekundärtitel verwenden" auf einer Alternativnamen-Zeile
 * (#203-Folge): tauscht die Zeile mit `BoardGame.secondaryTitle`. War noch
 * kein Sekundärtitel gesetzt, gibt es nichts zurückzutauschen — die Zeile
 * wird dann gelöscht statt eine leere Zeile zu hinterlassen (ihr Wert ist ja
 * jetzt der Sekundärtitel).
 */
export async function promoteAlternateNameToSecondaryTitle(
  alternateNameId: string,
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const boardGameId = await prisma.$transaction(async (tx) => {
    const alternateName = await tx.boardGameAlternateName.findUnique({
      where: { id: alternateNameId },
      include: { boardGame: { select: { id: true, secondaryTitle: true } } },
    });
    if (!alternateName) return null;

    await tx.boardGame.update({
      where: { id: alternateName.boardGame.id },
      data: { secondaryTitle: alternateName.name },
    });
    await replaceOrDeleteAlternateName(
      tx,
      alternateNameId,
      alternateName.boardGame.secondaryTitle,
    );

    return alternateName.boardGame.id;
  });

  if (!boardGameId) {
    return { error: "Alternativname wurde nicht gefunden." };
  }

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/**
 * Tauscht Haupttitel und Sekundärtitel (#203-Folge) — von beiden Zeilen im
 * "Alle Titel"-Dialog auslösbar ("Als Haupttitel verwenden" auf der
 * Sekundärtitel-Zeile bzw. "Als Sekundärtitel verwenden" auf der
 * Haupttitel-Zeile sind dieselbe Operation). Ohne gesetzten Sekundärtitel
 * gäbe es nichts zum Zurücktauschen und der Haupttitel würde leer — dieser
 * Fall wird abgelehnt statt eine Pflichtangabe zu leeren.
 */
export async function swapTitleAndSecondaryTitle(boardGameId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const game = await prisma.boardGame.findUnique({
    where: { id: boardGameId },
    select: { title: true, secondaryTitle: true },
  });
  if (!game) {
    return { error: "Titel wurde nicht gefunden." };
  }
  if (!game.secondaryTitle) {
    return { error: "Kein Sekundärtitel gesetzt." };
  }

  await prisma.boardGame.update({
    where: { id: boardGameId },
    data: { title: game.secondaryTitle, secondaryTitle: game.title },
  });

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/**
 * Entfernt nur den "Sekundärtitel"-Status (#203-Folge-Korrektur) — der Text
 * geht dabei nicht verloren, sondern wird als Alternativname weitergeführt,
 * konsistent mit dem "nie Datenverlust"-Prinzip der übrigen Tausch-Aktionen
 * hier. Zum endgültigen Verwerfen des Texts siehe `deleteSecondaryTitle`.
 */
export async function clearSecondaryTitle(boardGameId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const cleared = await prisma.$transaction(async (tx) => {
    const game = await tx.boardGame.findUnique({
      where: { id: boardGameId },
      select: { secondaryTitle: true },
    });
    if (!game?.secondaryTitle) return false;

    await tx.boardGameAlternateName.create({
      data: { boardGameId, name: game.secondaryTitle },
    });
    await tx.boardGame.update({
      where: { id: boardGameId },
      data: { secondaryTitle: null },
    });
    return true;
  });

  if (!cleared) {
    return { error: "Kein Sekundärtitel gesetzt." };
  }

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/**
 * Löscht den Sekundärtitel endgültig (#203-Folge-Korrektur) — Gegenstück zu
 * `clearSecondaryTitle`, das den Text stattdessen als Alternativname
 * weiterführt. Für den Fall, dass der Text wirklich verworfen werden soll.
 */
export async function deleteSecondaryTitle(boardGameId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.boardGame.update({
    where: { id: boardGameId },
    data: { secondaryTitle: null },
  });

  await revalidateTitlePaths(boardGameId);
  return { success: true as const };
}

/** Lädt die Alternativnamen-Liste für den Titel-Editor (#187). Der
 * Sekundärtitel selbst ist ein eigenständiges `BoardGame`-Feld (#203), nicht
 * mehr Teil dieser Liste. */
export async function listAlternateNames(boardGameId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const alternateNames = await prisma.boardGameAlternateName.findMany({
    where: { boardGameId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, note: true },
  });

  return { success: true as const, alternateNames };
}
