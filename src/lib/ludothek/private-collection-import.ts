import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
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
  versionInputFromBgg,
} from "@/lib/ludothek/board-game-versions";
import { upsertBoardGameVersion } from "@/lib/ludothek/taxonomy/versions";
import { findOrCreateBoardGameTitle } from "@/lib/ludothek/board-games";
import { isCatalogStub } from "@/lib/ludothek/board-game-stub";
import { translateBggGameData } from "@/lib/ludothek/board-games-bgg-import";
import { sleep } from "@/lib/utils/sleep";
import type { BggCollectionEntry } from "@/lib/bgg/collection";

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
  if (existing && !isCatalogStub(existing)) return existing;

  try {
    const rawData = await fetchBggGame(entry.bggId);
    const { data } = await translateBggGameData(rawData);
    const input = bggDataToTitleInput(entry.bggId, data);
    await sleep(BGG_REQUEST_THROTTLE_MS);

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

/** Die auf BGG gewählte Version samt Verlagen im Katalog anlegen bzw.
 * aktualisieren — dieselbe Edition, die auch ein Vereinsexemplar bekäme
 * (eindeutig per BGG-Version-ID). Ohne gewählte Version `null`. */
async function resolvePrivateVersionId(
  boardGameId: string,
  entry: BggCollectionEntry,
): Promise<string | null> {
  if (!entry.version) return null;
  const version = await upsertBoardGameVersion(
    prisma,
    boardGameId,
    versionInputFromBgg(entry.version),
  );
  return version.id;
}

/**
 * Kern des privaten BGG-Collection-Imports (#255, #632) — läuft im
 * Queue-Worker (`private-collection-import-queue.ts`), nie direkt in einer
 * Server Action. Schreibt nur `PrivateGameCollectionEntry`, nie `GameCopy`.
 * Jeder Titel wird per BGG-ID gegen den Katalog abgeglichen
 * (`resolvePrivateTitle()`); ein neuer Titel bekommt volle BGG-Metadaten, die
 * gewählte Version samt Verlagen landet ebenfalls im Katalog. Bestehende
 * Einträge werden vor dem Import gelöscht statt gemergt — Titel, die nicht
 * mehr `owned=true` sind, sollen verschwinden. Cooldown und Berechtigung
 * prüfen die einreihenden Actions (`private-collection-sync.ts`).
 */
export async function runBggCollectionImport(meeple: {
  id: string;
  bggUsername: string;
}): Promise<{ error: string } | { success: true; imported: number }> {
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
    const versionId = await resolvePrivateVersionId(title.id, entry);
    await prisma.privateGameCollectionEntry.create({
      data: {
        meepleId: meeple.id,
        boardGameId: title.id,
        versionId,
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

  revalidatePath("/profil", "layout");
  revalidatePath("/ludothek");
  return { success: true, imported: entries.length };
}
