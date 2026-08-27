"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentMeeple } from "@/lib/members/meeples";
import {
  BggCollectionUnavailableError,
  fetchBggCollection,
} from "@/lib/bgg/collection";
import { BggApiError } from "@/lib/bgg/client";
import { findOrCreateBoardGameTitle } from "@/lib/ludothek/board-games";

/**
 * Manueller "Meine BGG-Collection importieren"-Trigger im eigenen Profil
 * (#255) — schreibt nur `PrivateGameCollectionEntry`, nie `GameCopy`
 * (kein Exemplar-Tracking für Privatbesitz). Jeder Titel wird per BGG-ID
 * gegen den bestehenden Katalog abgeglichen (`findOrCreateBoardGameTitle`,
 * neu anlegen falls nicht vorhanden). Duplikat-Erkennung läuft über den
 * bestehenden `@@unique([meepleId, boardGameId])`-Constraint per Upsert,
 * keine eigene Prüf-Logik nötig.
 */
export async function syncPrivateBggCollection() {
  const meeple = await getCurrentMeeple();
  if (!meeple) {
    return { error: "Keine Berechtigung." };
  }
  if (!meeple.bggUsername) {
    return {
      error: "Bitte zuerst einen BGG-Benutzernamen im Profil hinterlegen.",
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
  for (const entry of entries) {
    const title = await findOrCreateBoardGameTitle({
      title: entry.title,
      bggId: entry.bggId,
    });
    await prisma.privateGameCollectionEntry.upsert({
      where: {
        meepleId_boardGameId: { meepleId: meeple.id, boardGameId: title.id },
      },
      update: { syncedAt },
      create: { meepleId: meeple.id, boardGameId: title.id, syncedAt },
    });
  }

  revalidatePath("/profil");
  revalidatePath("/ludothek");
  return { success: true as const, imported: entries.length };
}
