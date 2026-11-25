import type { ProfilePictureVisibility } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type ForTradeOwner = {
  meepleId: string;
  name: string;
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
};

/** Ein Titel samt aller Personen, die ihn zum Tausch anbieten. */
export type ForTradeGame = {
  boardGameSlug: string;
  title: string;
  imageUrl: string | null;
  owners: ForTradeOwner[];
};

/**
 * Alle Titel, die Meeple in ihrer BGG-Collection als „For Trade“ markiert
 * haben — nur von Personen mit gesetzter Freigabe `shareForTrade`,
 * anonymisierte Meeple ausgenommen (#632-Folge). Speist die Zone „Zum Tausch
 * angeboten" unter den Kleinanzeigen auf `/markt` — ein Eintrag je Titel,
 * die anbietenden Personen darin gesammelt. `search` filtert wie die
 * Kleinanzeigen nach Titel (Groß-/Kleinschreibung egal).
 */
export async function findForTradeOffers(
  search?: string,
): Promise<ForTradeGame[]> {
  const term = search?.trim();
  const entries = await prisma.privateGameCollectionEntry.findMany({
    where: {
      forTrade: true,
      meeple: { shareForTrade: true, anonymizedAt: null },
      ...(term
        ? { boardGame: { title: { contains: term, mode: "insensitive" } } }
        : {}),
    },
    select: {
      id: true,
      boardGame: { select: { slug: true, title: true, imageUrl: true } },
      meeple: {
        select: {
          id: true,
          displayName: true,
          profilePictureUrl: true,
          profilePictureVisibility: true,
        },
      },
    },
  });
  const byGame = new Map<string, ForTradeGame>();
  for (const entry of entries) {
    const { boardGame, meeple } = entry;
    const game = byGame.get(boardGame.slug) ?? {
      boardGameSlug: boardGame.slug,
      title: boardGame.title,
      imageUrl: boardGame.imageUrl,
      owners: [],
    };
    game.owners.push({
      meepleId: meeple.id,
      name: meeple.displayName,
      profilePictureUrl: meeple.profilePictureUrl,
      profilePictureVisibility: meeple.profilePictureVisibility,
    });
    byGame.set(boardGame.slug, game);
  }
  return [...byGame.values()]
    .map((game) => ({
      ...game,
      owners: game.owners.sort((a, b) => a.name.localeCompare(b.name, "de")),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "de"));
}
