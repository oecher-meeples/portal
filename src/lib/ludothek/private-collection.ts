import {
  VERSION_DISPLAY_SELECT,
  versionDisplay,
} from "@/lib/ludothek/taxonomy/contributors-read";
import {
  BOARD_GAME_DISPLAY_SELECT,
  boardGameDisplayFields,
} from "@/lib/ludothek/board-game-display";
import { GameInventoryStatus } from "@prisma/client";
import type { LudothekGame } from "@/lib/ludothek/browser";
import { prisma } from "@/lib/utils/prisma";

/** Nur die wirklich privaten Felder auf oberster Ebene — Titel/Bild/Slug
 * kommen über die `boardGame`-Relation, nicht als eigene Kopien (#310):
 * private und Vereinsspiele sind beide dasselbe `BoardGame`-Titelobjekt. */
export type OwnPrivateCollectionEntry = {
  id: string;
  rating: number | null;
  forTrade: boolean;
  wantToPlay: boolean;
  boardGame: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
  };
  /** Die auf BGG hinterlegte Version, `null` ohne Angabe. */
  version: {
    name: string | null;
    yearPublished: number | null;
    languages: string[];
    publishers: string[];
  } | null;
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
      boardGame: {
        select: { id: true, slug: true, title: true, imageUrl: true },
      },
      version: {
        select: {
          name: true,
          yearPublished: true,
          ...VERSION_DISPLAY_SELECT.select,
        },
      },
    },
  });
  return entries.map(({ version, ...entry }) => {
    if (!version) return { ...entry, version: null };
    const { publisher, editionLanguages } = versionDisplay(version);
    return {
      ...entry,
      version: {
        name: version.name,
        yearPublished: version.yearPublished,
        languages: editionLanguages,
        publishers: publisher,
      },
    };
  });
}

/** Anzahl importierter Einträge eines Meeples (für fremde Profile, #632). */
export function countPrivateCollectionEntries(meepleId: string) {
  return prisma.privateGameCollectionEntry.count({ where: { meepleId } });
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
export async function buildPrivateLudothekGames({
  boardGameSlug,
}: {
  /** Nur diesen Titel (#526: Detailseiten-Fallback), sonst alle. */
  boardGameSlug?: string;
} = {}): Promise<LudothekGame[]> {
  const entries = await prisma.privateGameCollectionEntry.findMany({
    where: {
      meeple: { privateCollectionVisible: true },
      boardGame: {
        ...(boardGameSlug ? { slug: boardGameSlug } : {}),
        copies: {
          none: { status: { not: GameInventoryStatus.DEINVENTARISED } },
        },
      },
    },
    include: {
      version: VERSION_DISPLAY_SELECT,
      meeple: {
        select: {
          id: true,
          displayName: true,
          profilePictureUrl: true,
          profilePictureVisibility: true,
        },
      },
      boardGame: BOARD_GAME_DISPLAY_SELECT,
    },
  });

  return entries.map((entry) => {
    const boardGame = entry.boardGame;
    return {
      id: entry.id,
      ...boardGameDisplayFields(boardGame),
      slug: entry.id,
      // Privatbesitz hat kein Vereins-Exemplar — exemplarbezogene Felder leer.
      ean: null,
      condition: null,
      inventoryNumber: null,
      ruleBookLanguages: [],
      ...versionDisplay(entry.version),
      baseGames: [],
      expansions: [],
      zustand: "privat" as const,
      isLoanedOut: false,
      responsibleMeepleId: entry.meeple.id,
      responsibleName: entry.meeple.displayName,
      responsibleProfilePictureUrl: entry.meeple.profilePictureUrl,
      responsibleProfilePictureVisibility:
        entry.meeple.profilePictureVisibility,
      // Privatbesitz hat keine Vereins-Weitergabe/-Bestätigung (#456).
      isUnconfirmed: false,
      unitChain: "",
      locationChain: `bei ${entry.meeple.displayName} (privat)`,
      explainerCount: 0,
      hasOpenLfg: false,
      isPrivate: true,
    };
  });
}
