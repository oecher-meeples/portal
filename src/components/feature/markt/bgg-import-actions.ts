"use server";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import {
  BggCollectionUnavailableError,
  fetchBggCollection,
} from "@/lib/bgg/collection";
import { BggApiError } from "@/lib/bgg/client";
import { createMarketListing } from "@/components/feature/markt/actions";

export type BggForTradeEntry = {
  bggId: number;
  title: string;
  imageUrl: string | null;
};

const IMAGE_FETCH_TIMEOUT_MS = 8000;

/** Eigene BGG-Collection, gefiltert auf `forTrade` (#275) — Titel und Bild
 * werden 1:1 aus BGG übernommen, keine weitere Sortierung/Filterung nötig. */
export async function fetchOwnBggForTradeEntries(): Promise<
  { success: true; entries: BggForTradeEntry[] } | { error: string }
> {
  const meeple = await requireMeeple();
  if (!meeple.bggUsername) {
    return {
      error: "Bitte zuerst einen BGG-Benutzernamen im Profil hinterlegen.",
    };
  }

  try {
    const collection = await fetchBggCollection(meeple.bggUsername);
    return {
      success: true,
      entries: collection
        .filter((entry) => entry.forTrade)
        .map((entry) => ({
          bggId: entry.bggId,
          title: entry.title,
          imageUrl: entry.imageUrl,
        })),
    };
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
}

/** Lädt das BGG-Bild herunter und übernimmt es in den eigenen Blob Storage
 * (statt eines Hotlinks auf die BGG-URL) — konsistentes Fit-/Lightbox-/
 * Crop-Verhalten mit allen anderen Marktplatz-Bildern (#168–#175), kein
 * Abhängigkeitsrisiko bei BGG-URL-Änderungen. `null` bei jedem Fehler: das
 * Anlegen der Anzeige soll nicht an einem nicht ladbaren BGG-Bild scheitern. */
async function uploadBggImageToBlob(
  imageUrl: string,
  bggId: number,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const extension = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const bytes = await response.arrayBuffer();

    const blob = await put(
      `market-listings/bgg-${bggId}.${extension}`,
      Buffer.from(bytes),
      { access: "public", contentType, addRandomSuffix: true },
    );
    return blob.url;
  } catch {
    return null;
  }
}

export type CreateMarketListingFromBggInput = {
  bggId: number;
  title: string;
  imageUrl: string | null;
  description?: string | null;
  priceEuros: number;
  condition: string;
};

/** Legt eine Anzeige aus einem BGG-"for trade"-Eintrag an (#275) — Titel und
 * Bild kommen aus BGG, Beschreibung/Preis/Zustand pflegt der Meeple selbst.
 * Existiert der Titel bereits im Inventar (per `bggId` erkannt), wird die
 * Anzeige damit verknüpft (#278) statt eine eigene BGG-Referenz zu speichern
 * — der bestehende `BoardGame`-Datensatz trägt bereits den BGG-Link. */
export async function createMarketListingFromBgg(
  input: CreateMarketListingFromBggInput,
) {
  await requireMeeple();

  const imageUrls: string[] = [];
  if (input.imageUrl) {
    const uploaded = await uploadBggImageToBlob(input.imageUrl, input.bggId);
    if (uploaded) imageUrls.push(uploaded);
  }

  const matchingBoardGame = await prisma.boardGame.findUnique({
    where: { bggId: input.bggId },
    select: { id: true },
  });

  return createMarketListing({
    title: input.title,
    description: input.description,
    priceEuros: input.priceEuros,
    condition: input.condition,
    imageUrls,
    boardGameId: matchingBoardGame?.id ?? null,
  });
}
