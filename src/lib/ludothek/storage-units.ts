"use server";

import { revalidatePath } from "next/cache";
import { StorageUnitKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { nextUnitCode } from "@/lib/inventory/codes";
import { ensureMeeple } from "@/lib/members/meeples";
import { requirePermission } from "@/lib/auth/permissions";
import { moveStorageUnit } from "@/lib/ludothek/holdings";

/** Shared by every `/admin/einheiten` action and by the Ludothek
 * create-dialog's Standort-Feld — both need the same permission + actor. */
export async function requireGamesManage() {
  const user = await requirePermission("games:manage");
  return ensureMeeple(user);
}

export type CreateStorageUnitInput = {
  kind: StorageUnitKind;
  label: string;
  /** Explicit code (e.g. from a pre-printed label) — auto-generated via
   * `nextUnitCode` when omitted, see #121/#122. */
  code?: string;
  /** `"self"` resolves to the acting meeple server-side — callers never need
   * to know their own id (see the Ludothek create-dialog Standort-Feld). */
  keeperMeepleId?: string | "self" | null;
  parentUnitId?: string | null;
  locationNote?: string | null;
};

export async function createStorageUnit(input: CreateStorageUnitInput) {
  const actor = await requireGamesManage();

  const label = input.label.trim();
  if (!label) {
    return { error: "Bitte ein Label angeben." };
  }

  const explicitCode = input.code?.trim();
  let code: string;
  if (explicitCode) {
    const existing = await prisma.storageUnit.findUnique({
      where: { code: explicitCode },
      select: { id: true },
    });
    if (existing) {
      return { error: `Der Code „${explicitCode}“ ist bereits vergeben.` };
    }
    code = explicitCode;
  } else {
    const existingCodes = (
      await prisma.storageUnit.findMany({
        where: { kind: input.kind },
        select: { code: true },
      })
    ).map((u) => u.code);
    code = nextUnitCode(input.kind, existingCodes);
  }

  const keeperMeepleId =
    input.keeperMeepleId === "self" ? actor.id : (input.keeperMeepleId ?? null);

  const unit = await prisma.storageUnit.create({
    data: {
      code,
      kind: input.kind,
      label,
      keeperMeepleId,
      parentUnitId: input.parentUnitId ?? null,
      locationNote: input.locationNote ?? null,
    },
  });

  revalidatePath("/admin/einheiten");
  return { success: true as const, id: unit.id, code: unit.code };
}

/** Resolves a scanned/typed unit code against active units — the Ludothek
 * create-dialog's Standort-Feld uses this before offering to create a new
 * one (#121/#122). */
export async function findStorageUnitByCode(code: string) {
  await requireGamesManage();

  const unit = await prisma.storageUnit.findFirst({
    where: { code: code.trim().toUpperCase(), retiredAt: null },
    select: { id: true, label: true, code: true },
  });
  return unit;
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

/**
 * Hängt `unitId` unter `parentUnitId` (oder löst die Elternbeziehung, wenn
 * `null`) — von `/admin/einheiten` und, für die Regal-unter-Event-Zuordnung
 * (Stufe 2), von der Event-Ausgabe-Ansicht genutzt (#273). Kein neuer
 * Mechanismus, nur `moveStorageUnit()` mit Zyklen-Prüfung.
 */
export async function setUnitParent(
  unitId: string,
  parentUnitId: string | null,
) {
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
