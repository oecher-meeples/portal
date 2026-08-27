import { GameInventoryStatus } from "@prisma/client";
import type { LudothekGame } from "@/lib/ludothek/browser";
import { prisma } from "@/lib/utils/prisma";

export type OwnPrivateCollectionEntry = {
  id: string;
  title: string;
  imageUrl: string | null;
  rating: number | null;
  forTrade: boolean;
  wantToPlay: boolean;
};

/**
 * Die eigene importierte Collection eines Meeples (#255-Folge) — anders als
 * {@link buildPrivateLudothekGames} ohne Sichtbarkeits-Flag- und
 * Vereinsexemplar-Filter: "was habe ich importiert", nicht "was sehen
 * andere". Speist die Übersichts-Karte im eigenen Profil.
 */
export async function getOwnPrivateCollection(
  meepleId: string,
): Promise<OwnPrivateCollectionEntry[]> {
  const entries = await prisma.privateGameCollectionEntry.findMany({
    where: { meepleId },
    orderBy: { boardGame: { title: "asc" } },
    select: {
      id: true,
      rating: true,
      forTrade: true,
      wantToPlay: true,
      boardGame: { select: { title: true, imageUrl: true } },
    },
  });
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.boardGame.title,
    imageUrl: entry.boardGame.imageUrl,
    rating: entry.rating,
    forTrade: entry.forTrade,
    wantToPlay: entry.wantToPlay,
  }));
}

const IMPORT_COOLDOWN_MS = 60 * 60 * 1000;

async function hasSysadminRole(
  neonAuthUserId: string | null,
): Promise<boolean> {
  if (!neonAuthUserId) return false;
  const count = await prisma.role.count({
    where: { name: "sysadmin", users: { some: { neonAuthUserId } } },
  });
  return count > 0;
}

/**
 * Wer den 1h-Cooldown per Klick übergehen darf (Profil-Karte, "!"-Button):
 * im Dev-Environment jede:r, sonst nur sysadmin. Serverseitig maßgeblich —
 * `syncPrivateBggCollection()` prüft dies selbst, statt dem `ignoreCooldown`-
 * Flag aus dem Client-Aufruf blind zu vertrauen.
 */
export async function canForceImport(
  neonAuthUserId: string | null,
): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  return hasSysadminRole(neonAuthUserId);
}

/**
 * Cooldown für den manuellen BGG-Collection-Import (#255-Folge): 1h zwischen
 * zwei Importen, sysadmin ausgenommen. `null` heißt: Import ist jetzt
 * erlaubt. Berechnet aus `Meeple.privateCollectionSyncedAt`, nicht aus den
 * Collection-Einträgen — die werden bei jedem Import gelöscht und neu
 * angelegt und wären damit kein verlässlicher Cooldown-Anker.
 */
export async function getImportCooldownEndsAt(meeple: {
  privateCollectionSyncedAt: Date | null;
  neonAuthUserId: string | null;
}): Promise<Date | null> {
  if (!meeple.privateCollectionSyncedAt) return null;
  if (await hasSysadminRole(meeple.neonAuthUserId)) return null;

  const endsAt = new Date(
    meeple.privateCollectionSyncedAt.getTime() + IMPORT_COOLDOWN_MS,
  );
  return endsAt > new Date() ? endsAt : null;
}

/**
 * Privatbesitz-Einträge als vollwertige `LudothekGame`-Zeilen (#255-Folge) —
 * reihen sich in dieselbe Liste wie Vereinsspiele ein und laufen durch
 * dasselbe `filterLudothekGames()` (Spieleranzahl, Dauer, Mechaniken, Suche,
 * …). Query-seitig erzwungene Sichtbarkeit: nur Collections, deren Meeple
 * `privateCollectionVisible` gesetzt hat, und nur Titel **ohne** bestehendes
 * Vereinsexemplar — die tauchen sonst doppelt auf, einmal regulär mit
 * Standort/Zustand, einmal fälschlich als "privat" markiert.
 *
 * Ein neuer (nicht schon im Katalog vorhandener) Titel bekommt beim Import
 * volle BGG-Metadaten (`resolvePrivateTitle()` in
 * `private-collection-sync.ts`), genau wie ein Vereinsexemplar — Filter wie
 * Mechaniken/Gewicht/Dauer funktionieren also auch für privat importierte
 * Titel.
 */
export async function buildPrivateLudothekGames(): Promise<LudothekGame[]> {
  const entries = await prisma.privateGameCollectionEntry.findMany({
    where: {
      meeple: { privateCollectionVisible: true },
      boardGame: {
        copies: {
          none: { status: { not: GameInventoryStatus.DEINVENTARISED } },
        },
      },
    },
    include: {
      meeple: { select: { id: true, displayName: true } },
      boardGame: { include: { alternateNames: { select: { name: true } } } },
    },
  });

  return entries.map((entry) => {
    const boardGame = entry.boardGame;
    return {
      id: entry.id,
      boardGameId: boardGame.id,
      slug: entry.id,
      boardGameSlug: boardGame.slug,
      title: boardGame.title,
      imageUrl: boardGame.imageUrl,
      minPlayers: boardGame.minPlayers,
      maxPlayers: boardGame.maxPlayers,
      playTimeMinutes: boardGame.playTimeMinutes,
      weight: boardGame.weight,
      averageRating: boardGame.averageRating,
      mechanics: boardGame.mechanics,
      ean: null,
      condition: null,
      inventoryNumber: null,
      bggId: boardGame.bggId,
      alternateNames: boardGame.alternateNames.map((a) => a.name),
      secondaryTitle: boardGame.secondaryTitle,
      description: boardGame.description,
      explainerVideoUrl: boardGame.explainerVideoUrl,
      kind: boardGame.kind,
      languageDependence: boardGame.languageDependence,
      ruleBookLanguages: [],
      publisher: boardGame.publisher,
      author: boardGame.author,
      yearPublished: boardGame.yearPublished,
      baseGames: [],
      expansions: [],
      zustand: "privat" as const,
      isLoanedOut: false,
      responsibleMeepleId: entry.meeple.id,
      responsibleName: entry.meeple.displayName,
      unitChain: "",
      locationChain: `bei ${entry.meeple.displayName} (privat)`,
      explainerCount: 0,
      hasOpenLfg: false,
      isPrivate: true,
    };
  });
}
