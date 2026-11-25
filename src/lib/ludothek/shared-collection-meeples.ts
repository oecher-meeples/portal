import type { ProfilePictureVisibility } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type SharedCollectionMeeple = {
  meepleId: string;
  name: string;
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
};

export type SharedCollectionFlag = "wantToPlay" | "forTrade";

const MEEPLE_SELECT = {
  id: true,
  displayName: true,
  profilePictureUrl: true,
  profilePictureVisibility: true,
} as const;

type MeepleRow = {
  id: string;
  displayName: string;
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
};

function toSharedMeeples(meeples: MeepleRow[]): SharedCollectionMeeple[] {
  const byId = new Map(meeples.map((meeple) => [meeple.id, meeple]));
  return [...byId.values()]
    .map((meeple) => ({
      meepleId: meeple.id,
      name: meeple.displayName,
      profilePictureUrl: meeple.profilePictureUrl,
      profilePictureVisibility: meeple.profilePictureVisibility,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/**
 * Meeple, die diesen Titel als „Want to Play" (`GameWantToPlay`, manuell oder
 * per BGG-Import, #637) bzw. „For Trade" (BGG-Collection mit Freigabe
 * `shareForTrade`) markiert haben. Want to Play braucht keine weitere
 * Freigabe. Anonymisierte Meeple bleiben außen vor. Nur für eingeloggte
 * Meeple aufrufen.
 */
export async function findSharedCollectionMeeples(
  boardGameId: string,
  flag: SharedCollectionFlag,
): Promise<SharedCollectionMeeple[]> {
  const rows =
    flag === "wantToPlay"
      ? await prisma.gameWantToPlay.findMany({
          where: { boardGameId, meeple: { anonymizedAt: null } },
          select: { meeple: { select: MEEPLE_SELECT } },
        })
      : await prisma.privateGameCollectionEntry.findMany({
          where: {
            boardGameId,
            forTrade: true,
            meeple: { shareForTrade: true, anonymizedAt: null },
          },
          select: { meeple: { select: MEEPLE_SELECT } },
        });
  return toSharedMeeples(rows.map(({ meeple }) => meeple));
}

/** Titel ohne Vereins-/Privatexemplar, aber mit mindestens einem
 * Want-to-Play-Eintrag (#637) — Grundlage der abgespeckten Katalogseite.
 * `null`, wenn niemand den Titel (noch) auf der Liste hat. */
export function findWantToPlayCatalogTitle(slug: string) {
  return prisma.boardGame.findFirst({
    where: {
      slug,
      wantToPlayMarks: { some: { meeple: { anonymizedAt: null } } },
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      yearPublished: true,
      averageRating: true,
      bggId: true,
    },
  });
}
