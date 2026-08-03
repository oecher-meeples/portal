"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  toSparePartListingData,
  validateSparePartListingInput,
  type SparePartListingInput,
} from "@/lib/inventory/spare-part-listings";

export async function createSparePartListing(input: SparePartListingInput) {
  await requirePermission("games:manage");

  const validationError = validateSparePartListingInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const listing = await prisma.sparePartListing.create({
    data: toSparePartListingData(input),
  });

  revalidatePath("/markt");
  revalidatePath("/admin/bestand");
  return { success: true as const, id: listing.id };
}

export async function deleteSparePartListing(id: string) {
  await requirePermission("games:manage");

  await prisma.sparePartListing.delete({ where: { id } });

  revalidatePath("/markt");
  revalidatePath("/admin/bestand");
  return { success: true as const };
}
