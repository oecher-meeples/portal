"use server";

import { revalidatePath } from "next/cache";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { normaliseBlobPath } from "@/lib/utils/blob-path";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type MarketListingInput = {
  title: string;
  description?: string | null;
  priceEuros: number;
  condition: string;
  imageUrls?: string[];
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
  if (listing.sellerMeepleId !== meeple.id) {
    return { error: "Nur die eigene Anzeige kann bearbeitet werden." };
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

  await prisma.marketListing.delete({ where: { id } });

  revalidatePath("/markt");
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
