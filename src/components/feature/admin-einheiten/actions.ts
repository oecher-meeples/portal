"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { ensureMeeple } from "@/lib/members/meeples";
import { moveStorageUnit } from "@/lib/ludothek/holdings";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import {
  requireGamesManage,
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
};

export async function updateStorageUnit(
  id: string,
  input: UpdateStorageUnitInput,
) {
  await requireGamesManage();

  const label = input.label.trim();
  if (!label) {
    return { error: "Bitte ein Label angeben." };
  }

  await prisma.storageUnit.update({
    where: { id },
    data: { label, locationNote: input.locationNote ?? null },
  });

  revalidatePath("/admin/einheiten");
  return { success: true as const };
}

export async function retireStorageUnit(id: string) {
  await requireGamesManage();

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
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Bitte anmelden." };
  }
  const actingMeeple = await ensureMeeple(user);
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
