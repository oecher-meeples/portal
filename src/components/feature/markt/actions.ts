"use server";

import { revalidatePath } from "next/cache";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { hasPermission } from "@/lib/auth/permissions";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { deleteBlobs } from "@/lib/utils/blob-delete";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type MarketListingInput = {
  title: string;
  description?: string | null;
  priceEuros: number;
  condition: string;
  imageUrls?: string[];
  /** Link zum Inventar-Titel (#278) — nur bei Anlage per BGG-Import gesetzt,
   * `undefined` in den normalen Formularen lässt einen bestehenden Link beim
   * Bearbeiten unangetastet (Prisma ignoriert `undefined`-Felder im Update). */
  boardGameId?: string | null;
};

function validateMarketListingInput(input: MarketListingInput) {
  if (!input.title.trim()) {
    return "Bitte einen Titel angeben.";
  }
  if (!input.condition.trim()) {
    return "Bitte einen Zustand angeben.";
  }
  if (!Number.isInteger(input.priceEuros) || input.priceEuros < 0) {
    return "Bitte einen gültigen Preis angeben.";
  }
  return null;
}

function toMarketListingData(input: MarketListingInput) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priceEuros: input.priceEuros,
    condition: input.condition.trim(),
    imageUrls: input.imageUrls ?? [],
    boardGameId: input.boardGameId,
  };
}

export async function createMarketListing(input: MarketListingInput) {
  const meeple = await requireMeeple();

  const validationError = validateMarketListingInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const listing = await prisma.marketListing.create({
    data: { sellerMeepleId: meeple.id, ...toMarketListingData(input) },
  });

  revalidatePath("/markt");
  return { success: true as const, id: listing.id };
}

export async function updateOwnMarketListing(
  id: string,
  input: MarketListingInput,
) {
  const meeple = await requireMeeple();

  const listing = await prisma.marketListing.findUnique({ where: { id } });
  if (!listing) {
    return { error: "Anzeige nicht gefunden." };
  }
  const isAdmin = meeple.neonAuthUserId
    ? await hasPermission(meeple.neonAuthUserId, "admin:access")
    : false;
  if (listing.sellerMeepleId !== meeple.id && !isAdmin) {
    return {
      error: "Nur die eigene Anzeige oder ein Admin kann sie bearbeiten.",
    };
  }

  const validationError = validateMarketListingInput(input);
  if (validationError) {
    return { error: validationError };
  }

  await prisma.marketListing.update({
    where: { id },
    data: toMarketListingData(input),
  });

  revalidatePath("/markt");
  revalidatePath(`/markt/${id}`);
  return { success: true as const };
}

export async function deleteOwnMarketListing(id: string) {
  const meeple = await requireMeeple();

  const listing = await prisma.marketListing.findUnique({ where: { id } });
  if (!listing) {
    return { error: "Anzeige nicht gefunden." };
  }
  if (listing.sellerMeepleId !== meeple.id) {
    return { error: "Nur die eigene Anzeige kann gelöscht werden." };
  }

  await deleteBlobs(listing.imageUrls);
  await prisma.marketListing.delete({ where: { id } });

  revalidatePath("/markt");
  return { success: true as const };
}

/** Löscht ein einzelnes, bereits hochgeladenes Bild aus dem Blob Store —
 * genutzt beim Entfernen/Ersetzen (Zuschneiden) einzelner Bilder im
 * Markt-Formular (#175), bevor/nachdem die Anzeige gespeichert wird. */
export async function deleteMarketListingImage(url: string) {
  await requireMeeple();
  await deleteBlobs([url]);
  return { success: true as const };
}

export async function getMarketListingUploadToken(pathname: string) {
  await requireMeeple();

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "market-listings"),
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}
