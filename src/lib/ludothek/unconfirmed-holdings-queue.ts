import { prisma } from "@/lib/utils/prisma";
import { memberDisplayName } from "@/lib/members/member-display-name";

export type UnconfirmedHoldingRow = {
  id: string;
  boardGameSlug: string;
  gameTitle: string;
  recipientName: string;
  startedAt: Date;
};

/** Für die StatTile auf `/admin/bestand` (analog `countActiveMeepleHoldings()`). */
export async function countUnconfirmedHoldings(): Promise<number> {
  return prisma.gameHolding.count({
    where: {
      endedAt: null,
      confirmedAt: null,
      origin: "HANDOVER",
      vereinsmitgliedId: { not: null },
    },
  });
}

/**
 * Offene, unbestätigte Übergaben für die Spielewart-Antrags-Queue auf
 * `/admin/bestand/unbestaetigt` (#290) — nur HANDOVER-Herkunft: eine RETURN
 * wird nicht per Klick bestätigt, sondern durch Einlagern in eine Einheit
 * (siehe `confirmHoldingAsGamesManager()`), würde hier also nur einen
 * wirkungslosen Button zeigen.
 */
export async function getUnconfirmedHoldingsQueue(): Promise<
  UnconfirmedHoldingRow[]
> {
  const holdings = await prisma.gameHolding.findMany({
    where: {
      endedAt: null,
      confirmedAt: null,
      origin: "HANDOVER",
      vereinsmitgliedId: { not: null },
    },
    orderBy: { startedAt: "asc" },
    include: {
      gameCopy: {
        select: { boardGame: { select: { slug: true, title: true } } },
      },
      vereinsmitglied: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          memberNumber: true,
          meeple: { select: { displayName: true } },
        },
      },
    },
  });

  return holdings.map((holding) => ({
    id: holding.id,
    boardGameSlug: holding.gameCopy.boardGame.slug,
    gameTitle: holding.gameCopy.boardGame.title,
    recipientName: memberDisplayName(holding.vereinsmitglied!),
    startedAt: holding.startedAt,
  }));
}
