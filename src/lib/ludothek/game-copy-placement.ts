export type CopyPlacementInput = { unitId: string } | { self: true };

/** Normalises the wizard's placement choice into `createGameCopyTx`'s shape —
 * shared by `createBoardGame` (first copy) and `createGameCopy` (further
 * copies of an existing title, see #183). Plain sync helper — kept out of the
 * `"use server"` modules, since every export there must be an async Server
 * Action. */
export function resolveCopyPlacement(
  placement: CopyPlacementInput | undefined,
  actorId: string,
): { unitId?: string; meepleId?: string } | undefined {
  if (!placement) return undefined;
  return "self" in placement
    ? { meepleId: actorId }
    : { unitId: placement.unitId };
}
