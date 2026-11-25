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
 * Meeple, die diesen Titel in ihrer BGG-Collection als „Want to Play" bzw.
 * „For Trade" markiert **und** die zugehörige Freigabe (`shareWantToPlay`/
 * `shareForTrade`) gesetzt haben (#632-Folge). Für „Want to Play" kommen die
 * manuell gesetzten „Ich will das auch spielen"-Markierungen
 * (`GameWantToPlay`) dazu — eine Person erscheint nur einmal. Anonymisierte
 * Meeple bleiben außen vor. Nur für eingeloggte Meeple aufrufen — die
 * Freigabe gilt ausdrücklich nur gegenüber anderen Meeple.
 */
export async function findSharedCollectionMeeples(
  boardGameId: string,
  flag: SharedCollectionFlag,
): Promise<SharedCollectionMeeple[]> {
  const entries = await prisma.privateGameCollectionEntry.findMany({
    where: {
      boardGameId,
      [flag]: true,
      meeple: {
        ...(flag === "wantToPlay"
          ? { shareWantToPlay: true }
          : { shareForTrade: true }),
        anonymizedAt: null,
      },
    },
    select: { meeple: { select: MEEPLE_SELECT } },
  });
  const marks =
    flag === "wantToPlay"
      ? await prisma.gameWantToPlay.findMany({
          where: { boardGameId, meeple: { anonymizedAt: null } },
          select: { meeple: { select: MEEPLE_SELECT } },
        })
      : [];
  return toSharedMeeples([...entries, ...marks].map(({ meeple }) => meeple));
}

/** Hat dieses Meeple den Titel manuell als „Ich will das auch spielen"
 * markiert? */
export async function hasWantToPlayMark(
  meepleId: string,
  boardGameId: string,
): Promise<boolean> {
  const count = await prisma.gameWantToPlay.count({
    where: { meepleId, boardGameId },
  });
  return count > 0;
}
