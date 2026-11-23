"use server";

import { revalidatePath } from "next/cache";
import type { ShelfCategory } from "@prisma/client";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { moveStorageUnit } from "@/lib/ludothek/holdings";
import { hasPermission } from "@/lib/auth/permissions";
import {
  createStorageUnit as libCreateStorageUnit,
  findStorageUnitByCode as libFindStorageUnitByCode,
  setUnitParent as libSetUnitParent,
  type CreateStorageUnitInput,
} from "@/lib/ludothek/storage-units";

// Thin wrappers so `/admin/einheiten` components keep importing from
// "./actions" — the implementation moved to lib/ludothek (shared with the
// Ludothek create-dialog's Standort-Feld, see #121/#122).
// A "use server" file may only export async functions declared in the file
// itself — `export { x } from "..."` re-exports are rejected by Next.js at
// build time, hence the wrappers instead of a re-export (see #147).
export async function createStorageUnit(input: CreateStorageUnitInput) {
  return libCreateStorageUnit(input);
}

export async function findStorageUnitByCode(code: string) {
  return libFindStorageUnitByCode(code);
}

export type UpdateStorageUnitInput = {
  label: string;
  locationNote?: string | null;
  /** Feste Regal-Kategorie (#276) — `null`/`undefined` löscht sie wieder. */
  category?: ShelfCategory | null;
};

export async function updateStorageUnit(
  id: string,
  input: UpdateStorageUnitInput,
) {
  await requireActionPermission("games:manage");

  const label = input.label.trim();
  if (!label) {
    return { error: "Bitte ein Label angeben." };
  }

  await prisma.storageUnit.update({
    where: { id },
    data: {
      label,
      locationNote: input.locationNote ?? null,
      category: input.category ?? null,
    },
  });

  revalidatePath("/admin/einheiten");
  return { success: true as const };
}

export async function retireStorageUnit(id: string) {
  await requireActionPermission("games:manage");

  const [openHoldings, childUnits] = await Promise.all([
    prisma.gameHolding.count({ where: { unitId: id, endedAt: null } }),
    prisma.storageUnit.count({ where: { parentUnitId: id, retiredAt: null } }),
  ]);

  if (openHoldings > 0 || childUnits > 0) {
    return {
      error:
        "Diese Einheit ist nicht leer — erst Spiele und untergeordnete Einheiten umlagern.",
    };
  }

  await prisma.storageUnit.update({
    where: { id },
    data: { retiredAt: new Date() },
  });

  revalidatePath("/admin/einheiten");
  return { success: true as const };
}

/**
 * Admins can assign any Meeple as keeper; everyone else can only claim a
 * unit for themselves — never assign it to someone else.
 */
export async function assignStorageUnitKeeper(
  unitId: string,
  keeperMeepleId: string | null,
) {
  // Verwahren heißt Annehmen — dasselbe Recht wie Ausleihen, und wie dort
  // ohne `settlement`: Ausgetretene übernehmen nichts mehr (#522).
  const { user, meeple: actingMeeple } =
    await requireActionPermission("ludothek:borrow");
  const isAdmin = await hasPermission(user.id, "games:manage");

  if (!isAdmin && keeperMeepleId !== actingMeeple.id) {
    return { error: "Du kannst eine Einheit nur dir selbst zuweisen." };
  }

  const unit = await prisma.storageUnit.findUnique({ where: { id: unitId } });
  if (!unit || unit.retiredAt) {
    return { error: "Einheit nicht gefunden oder stillgelegt." };
  }

  await moveStorageUnit({
    unitId,
    recordedByMeepleId: actingMeeple.id,
    keeperMeepleId,
    parentUnitId: unit.parentUnitId,
    locationNote: unit.locationNote,
  });

  revalidatePath("/admin/einheiten");
  revalidatePath(`/admin/einheiten/${unitId}`);
  return { success: true as const };
}

export async function setUnitParent(
  unitId: string,
  parentUnitId: string | null,
) {
  return libSetUnitParent(unitId, parentUnitId);
}
