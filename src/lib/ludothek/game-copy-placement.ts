import { prisma } from "@/lib/utils/prisma";

export type CopyPlacementInput = { unitId: string } | { self: true };

/** Resolves the acting Meeple's own `Member` id for a "self" placement (#333)
 * — shared by `createGameCopy` and `createBoardGame`, the two callers that
 * offer "bei mir selbst" as a placement option. Returns an error message
 * instead of throwing, matching this module's `{ error } | value` callers. */
export async function resolveOwnVereinsmitgliedIdForPlacement(
  placement: CopyPlacementInput | undefined,
  actorMeepleId: string,
): Promise<{ error: string } | { vereinsmitgliedId: string | undefined }> {
  if (!placement || !("self" in placement)) {
    return { vereinsmitgliedId: undefined };
  }
  const ownMember = await prisma.member.findUnique({
    where: { meepleId: actorMeepleId },
    select: { id: true },
  });
  if (!ownMember) {
    return {
      error:
        "Dieses Konto ist mit keinem Vereinsmitglied verknüpft — Platzierung bei sich selbst ist nur für Vereinsmitglieder möglich.",
    };
  }
  return { vereinsmitgliedId: ownMember.id };
}

/** Normalises the wizard's placement choice into `createGameCopyTx`'s shape —
 * shared by `createBoardGame` (first copy) and `createGameCopy` (further
 * copies of an existing title, see #183). Plain sync helper — kept out of the
 * `"use server"` modules, since every export there must be an async Server
 * Action.
 *
 * `actorVereinsmitgliedId` is the acting user's own `Member` id (#333) —
 * resolved by the caller, since a holding target is always a Vereinsmitglied,
 * not a Meeple. `undefined` when the actor has no linked Member (Systemkonto);
 * the caller must then reject a "self" placement before calling this. */
export function resolveCopyPlacement(
  placement: CopyPlacementInput | undefined,
  actorVereinsmitgliedId: string | undefined,
): { unitId?: string; vereinsmitgliedId?: string } | undefined {
  if (!placement) return undefined;
  return "self" in placement
    ? { vereinsmitgliedId: actorVereinsmitgliedId }
    : { unitId: placement.unitId };
}
