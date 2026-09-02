"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentMeeple } from "@/lib/members/meeples";
import {
  BggCollectionUnavailableError,
  fetchBggCollection,
} from "@/lib/bgg/collection";
import {
  BGG_REQUEST_THROTTLE_MS,
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
} from "@/lib/bgg/client";
import {
  bggDataToTitleInput,
  toBoardGameTitleData,
} from "@/lib/ludothek/board-game-versions";
import { findOrCreateBoardGameTitle } from "@/lib/ludothek/board-games";
import { translateBggGameData } from "@/lib/ludothek/board-games-bgg-import";
import {
  canForceImport,
  getImportCooldownEndsAt,
} from "@/lib/ludothek/private-collection";
import { formatTimePlain } from "@/lib/utils/format";
import { sleep } from "@/lib/utils/sleep";
import type { BoardGame } from "@prisma/client";
import type { BggCollectionEntry } from "@/lib/bgg/collection";

/** Ein früherer Import ist am `fetchBggGame()`-Aufruf gescheitert und hat nur
 * Titel + `bggId` hinterlassen (Fallback unten) — an den fehlenden
 * Kernfeldern zuverlässig erkennbar, unabhängig davon, wie „leer" ein
 * wirklich spärlicher BGG-Eintrag sonst sein könnte. */
function isIncompleteStub(boardGame: BoardGame) {
  return (
    !boardGame.imageUrl &&
    !boardGame.description &&
    boardGame.minPlayers === null &&
    boardGame.maxPlayers === null
  );
}

/**
 * Ein wirklich neuer Titel (kein bereits katalogisierter `bggId`) bekommt
 * dieselben vollen, übersetzten BGG-Metadaten wie beim Vereinsexemplar-Import
 * (#255-Folge, #278-Folge: bisher fehlte hier die deutsche Übersetzung aus
 * `translateBggGameData()`) — nicht nur Titel + BGG-ID. Ein zuvor als Stub
 * angelegter Titel (voriger Import ist am Einzelabruf gescheitert) wird bei
 * jedem weiteren Sync erneut versucht, statt für immer leer zu bleiben.
 * Schlägt der Abruf wieder fehl (BGG nicht erreichbar/Eintrag entfernt),
 * bleibt der bestehende Titel unangetastet bzw. der Stub-Fallback greift —
 * ein einzelner fehlgeschlagener Titel bricht nicht den gesamten Import ab.
 */
async function resolvePrivateTitle(entry: BggCollectionEntry) {
  const existing = await prisma.boardGame.findUnique({
    where: { bggId: entry.bggId },
  });
  if (existing && !isIncompleteStub(existing)) return existing;

  try {
    const rawData = await fetchBggGame(entry.bggId);
    const { data } = await translateBggGameData(rawData);
    const input = bggDataToTitleInput(entry.bggId, data);
    await sleep(BGG_REQUEST_THROTTLE_MS);

    if (existing) {
      return await prisma.boardGame.update({
        where: { id: existing.id },
        data: { title: input.title, ...toBoardGameTitleData(input) },
      });
    }
    return await findOrCreateBoardGameTitle(input);
  } catch (error) {
    if (existing) return existing;
    if (error instanceof BggNotFoundError || error instanceof BggApiError) {
      return findOrCreateBoardGameTitle({
        title: entry.title,
        bggId: entry.bggId,
      });
    }
    throw error;
  }
}

/**
 * Manueller "Meine BGG-Collection importieren"-Trigger im eigenen Profil
 * (#255) — schreibt nur `PrivateGameCollectionEntry`, nie `GameCopy`
 * (kein Exemplar-Tracking für Privatbesitz). Jeder Titel wird per BGG-ID
 * gegen den bestehenden Katalog abgeglichen (`resolvePrivateTitle()`) — ein
 * wirklich neuer Titel bekommt volle BGG-Metadaten, genau wie beim
 * Vereinsexemplar-Import (#255-Folge). Bestehende Einträge werden vor dem
 * Import gelöscht statt gemergt — Titel, die nicht mehr `owned=true` sind,
 * sollen verschwinden, kein reiner Upsert. 1h-Cooldown zwischen zwei
 * Importen (sysadmin ausgenommen), siehe `getImportCooldownEndsAt()`.
 *
 * `ignoreCooldown` ist der "!"-Button auf der Profil-Karte (Dev-Environment
 * und sysadmin dauerhaft) — das Flag aus dem Client-Aufruf allein zählt
 * nicht, `canForceImport()` prüft serverseitig erneut, wer es wirklich
 * nutzen darf.
 */
export async function syncPrivateBggCollection(ignoreCooldown = false) {
  const meeple = await getCurrentMeeple();
  if (!meeple) {
    return { error: "Keine Berechtigung." };
  }
  if (!meeple.bggUsername) {
    return {
      error: "Bitte zuerst einen BGG-Benutzernamen im Profil hinterlegen.",
    };
  }

  const cooldownEndsAt =
    ignoreCooldown && (await canForceImport(meeple.neonAuthUserId))
      ? null
      : await getImportCooldownEndsAt(meeple);
  if (cooldownEndsAt) {
    return {
      error: `Import erst wieder ab ${formatTimePlain(cooldownEndsAt)} möglich (1h Cooldown).`,
    };
  }

  let entries;
  try {
    entries = await fetchBggCollection(meeple.bggUsername);
  } catch (error) {
    if (error instanceof BggCollectionUnavailableError) {
      return { error: error.message };
    }
    if (error instanceof BggApiError) {
      return {
        error:
          "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }

  const syncedAt = new Date();
  await prisma.privateGameCollectionEntry.deleteMany({
    where: { meepleId: meeple.id },
  });
  for (const entry of entries) {
    const title = await resolvePrivateTitle(entry);
    await prisma.privateGameCollectionEntry.create({
      data: {
        meepleId: meeple.id,
        boardGameId: title.id,
        syncedAt,
        rating: entry.rating,
        forTrade: entry.forTrade,
        wantToPlay: entry.wantToPlay,
      },
    });
  }
  await prisma.meeple.update({
    where: { id: meeple.id },
    data: { privateCollectionSyncedAt: syncedAt },
  });

  revalidatePath("/profil");
  revalidatePath("/ludothek");
  return { success: true as const, imported: entries.length };
}
