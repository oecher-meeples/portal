"use server";

import { prisma } from "@/lib/utils/prisma";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { describeVersion } from "@/lib/ludothek/taxonomy/version-label";
import { fetchBggGame, type BggVersion } from "@/lib/bgg/client";

export type EditionOption = {
  id: string;
  /** Anzeigetext, z. B. „Heidelberger Spieleverlag · German (2015)“. */
  label: string;
};

/** Die bereits gespeicherten Editionen eines Titels — Auswahl im Exemplar-
 * Dialog. Nur für `games:manage`, weil dort Editionen zugewiesen werden. */
export async function getBoardGameEditions(
  boardGameId: string,
): Promise<EditionOption[]> {
  const user = await requireGamesManagePermission();
  if (!user) return [];

  const versions = await prisma.boardGameVersion.findMany({
    where: { boardGameId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      yearPublished: true,
      languages: true,
      publishers: { select: { contributor: { select: { name: true } } } },
    },
  });

  return versions.map((version) => ({
    id: version.id,
    label: describeVersion({
      publishers: version.publishers.map((p) => p.contributor.name),
      languages: version.languages,
      yearPublished: version.yearPublished,
      name: version.name,
    }),
  }));
}

/** BGG-Versionen eines Titels, die noch nicht als Version gespeichert sind —
 * im Exemplar-Dialog direkt auswählbar. Ohne BGG-ID oder bei einem
 * BGG-Fehler leer: die Auswahl gespeicherter oder manueller Versionen bleibt
 * davon unberührt. */
export async function getUnsavedBggVersions(
  boardGameId: string,
): Promise<BggVersion[]> {
  const user = await requireGamesManagePermission();
  if (!user) return [];

  const game = await prisma.boardGame.findUnique({
    where: { id: boardGameId },
    select: { bggId: true, versions: { select: { bggVersionId: true } } },
  });
  if (!game?.bggId) return [];

  const saved = new Set(game.versions.map((v) => v.bggVersionId));
  try {
    const data = await fetchBggGame(game.bggId);
    return data.versions.filter(
      (v) => v.bggVersionId === null || !saved.has(v.bggVersionId),
    );
  } catch {
    return [];
  }
}
