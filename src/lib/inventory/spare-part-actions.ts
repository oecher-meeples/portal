"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { hasPermission } from "@/lib/auth/permissions";
import {
  toSparePartListingData,
  validateSparePartListingInput,
  type SparePartListingInput,
} from "@/lib/inventory/spare-part-listings";

export type SparePartListingFormInput = Omit<
  SparePartListingInput,
  "keeperMeepleId"
>;

/** Verwahrer:in des Eintrags oder ein Meeple mit `games:manage` darf bearbeiten
 * bzw. löschen (#136) — kein Eigentumsübergang, nur eine Berechtigungsprüfung. */
async function canManageSparePartListing(
  meeple: { id: string; neonAuthUserId: string | null },
  keeperMeepleId: string,
) {
  if (meeple.id === keeperMeepleId) return true;
  return meeple.neonAuthUserId
    ? hasPermission(meeple.neonAuthUserId, "games:manage")
    : false;
}

function revalidateSparePartPaths() {
  revalidatePath("/markt");
  revalidatePath("/admin/bestand");
}

/** Jedes eingeloggte Meeple darf einen eigenen Ersatzteillager-Eintrag
 * anlegen (#136) — sofort öffentlich sichtbar, keine Freigabe nötig. Der
 * Verwahrer ist immer das anlegende Meeple selbst. */
export async function createSparePartListing(input: SparePartListingFormInput) {
  const meeple = await requireMeeple();

  const validationError = validateSparePartListingInput({
    ...input,
    keeperMeepleId: meeple.id,
  });
  if (validationError) {
    return { error: validationError };
  }

  const listing = await prisma.sparePartListing.create({
    data: toSparePartListingData({ ...input, keeperMeepleId: meeple.id }),
  });

  revalidateSparePartPaths();
  return { success: true as const, id: listing.id };
}

export async function updateSparePartListing(
  id: string,
  input: SparePartListingFormInput,
) {
  const meeple = await requireMeeple();

  const listing = await prisma.sparePartListing.findUnique({ where: { id } });
  if (!listing) {
    return { error: "Eintrag nicht gefunden." };
  }
  if (!(await canManageSparePartListing(meeple, listing.keeperMeepleId))) {
    return {
      error: "Nur der/die Verwahrer:in oder ein Admin kann bearbeiten.",
    };
  }

  const validationError = validateSparePartListingInput({
    ...input,
    keeperMeepleId: listing.keeperMeepleId,
  });
  if (validationError) {
    return { error: validationError };
  }

  await prisma.sparePartListing.update({
    where: { id },
    data: toSparePartListingData({
      ...input,
      keeperMeepleId: listing.keeperMeepleId,
    }),
  });

  revalidateSparePartPaths();
  return { success: true as const };
}

export async function deleteSparePartListing(id: string) {
  const meeple = await requireMeeple();

  const listing = await prisma.sparePartListing.findUnique({ where: { id } });
  if (!listing) {
    return { error: "Eintrag nicht gefunden." };
  }
  if (!(await canManageSparePartListing(meeple, listing.keeperMeepleId))) {
    return { error: "Nur der/die Verwahrer:in oder ein Admin kann löschen." };
  }

  await prisma.sparePartListing.delete({ where: { id } });

  revalidateSparePartPaths();
  return { success: true as const };
}
