"use server";

import { revalidatePath } from "next/cache";
import { StorageUnitKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { nextUnitCode } from "@/lib/inventory/codes";
import { ensureMeeple } from "@/lib/members/meeples";
import { requirePermission } from "@/lib/auth/permissions";

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
