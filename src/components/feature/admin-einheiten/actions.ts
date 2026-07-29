"use server";

import { revalidatePath } from "next/cache";
import { StorageUnitKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextUnitCode } from "@/lib/inventory/codes";
import { ensureMeeple } from "@/lib/meeples";
import { moveStorageUnit } from "@/lib/ludothek/holdings";
import { requirePermission } from "@/lib/permissions";

async function requireGamesManage() {
  const user = await requirePermission("games:manage");
  return ensureMeeple(user);
}

export type CreateStorageUnitInput = {
  kind: StorageUnitKind;
  label: string;
  keeperMeepleId?: string | null;
  parentUnitId?: string | null;
  locationNote?: string | null;
};

export async function createStorageUnit(input: CreateStorageUnitInput) {
  await requireGamesManage();

  const label = input.label.trim();
  if (!label) {
    return { error: "Bitte ein Label angeben." };
  }

  const existingCodes = (
    await prisma.storageUnit.findMany({
      where: { kind: input.kind },
      select: { code: true },
    })
  ).map((u) => u.code);

  const unit = await prisma.storageUnit.create({
    data: {
      code: nextUnitCode(input.kind, existingCodes),
      kind: input.kind,
      label,
      keeperMeepleId: input.keeperMeepleId ?? null,
      parentUnitId: input.parentUnitId ?? null,
      locationNote: input.locationNote ?? null,
    },
  });

  revalidatePath("/admin/einheiten");
  return { success: true as const, id: unit.id, code: unit.code };
}

export type UpdateStorageUnitInput = {
  label: string;
  locationNote?: string | null;
};

export async function updateStorageUnit(id: string, input: UpdateStorageUnitInput) {
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

/** Walks up from `parentId` to check whether `unitId` would become its own ancestor. */
async function wouldCreateCycle(unitId: string, parentId: string) {
  let currentId: string | null = parentId;
  const seen = new Set<string>();

  while (currentId) {
    if (currentId === unitId) return true;
    if (seen.has(currentId)) return false;
    seen.add(currentId);

    const parent: { parentUnitId: string | null } | null =
      await prisma.storageUnit.findUnique({
        where: { id: currentId },
        select: { parentUnitId: true },
      });
    currentId = parent?.parentUnitId ?? null;
  }

  return false;
}

export async function setUnitParent(unitId: string, parentUnitId: string | null) {
  const actor = await requireGamesManage();

  if (parentUnitId) {
    if (parentUnitId === unitId) {
      return { error: "Eine Einheit kann nicht in sich selbst stehen." };
    }
    if (await wouldCreateCycle(unitId, parentUnitId)) {
      return { error: "Das würde einen Kreis in der Standort-Kette erzeugen." };
    }
  }

  const unit = await prisma.storageUnit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return { error: "Einheit nicht gefunden." };
  }

  await moveStorageUnit({
    unitId,
    recordedByMeepleId: actor.id,
    keeperMeepleId: unit.keeperMeepleId,
    locationNote: unit.locationNote,
    parentUnitId,
  });

  revalidatePath("/admin/einheiten");
  return { success: true as const };
}
