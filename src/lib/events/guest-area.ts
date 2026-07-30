import type {
  ExplainerExperienceLevel,
  FleaMarketItemStatus,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { buildLudothekGames } from "@/lib/ludothek/query";
import {
  filterLudothekGames,
  type LudothekFilters,
  type LudothekGame,
} from "@/lib/ludothek/browser";

const MAX_UNIT_CHAIN_DEPTH = 20;

/**
 * True if `unitId` or one of its ancestors (box in shelf) is in `assignedUnitIds` —
 * the "im Raum" rule from CONTEXT.md/ADR 0005. Depth-limited like the responsibility
 * chain in `src/lib/ludothek/query.ts`, same class of problem.
 */
export function unitOrAncestorAssigned(
  unitId: string,
  assignedUnitIds: Set<string>,
  parentById: Map<string, string | null>,
): boolean {
  let currentId: string | null = unitId;
  let depth = 0;

  while (currentId && depth < MAX_UNIT_CHAIN_DEPTH) {
    if (assignedUnitIds.has(currentId)) return true;
    currentId = parentById.get(currentId) ?? null;
    depth += 1;
  }

  return false;
}

async function loadAssignedUnitIds(eventId: string) {
  const assignments = await prisma.eventShelfAssignment.findMany({
    where: { eventId },
    select: { unitId: true },
  });
  return new Set(assignments.map((a) => a.unitId));
}

async function loadUnitParents() {
  const units = await prisma.storageUnit.findMany({
    select: { id: true, parentUnitId: true },
  });
  return new Map(units.map((u) => [u.id, u.parentUnitId]));
}

async function loadOpenHoldingUnitByGame() {
  const holdings = await prisma.gameHolding.findMany({
    where: { endedAt: null, unitId: { not: null } },
    select: { boardGameId: true, unitId: true },
  });
  return new Map(holdings.map((h) => [h.boardGameId, h.unitId as string]));
}

/**
 * "Im Raum" = the game currently sits (directly or via an ancestor unit) in a
 * shelf assigned to this event (see CONTEXT.md "Regal-Zuordnung", ADR 0005).
 * A game held directly by a person (loaned out) is never in the room.
 */
export async function isGameInEventRoom(boardGameId: string, eventId: string) {
  const [assignedUnitIds, parentById, holdingUnitByGame] = await Promise.all([
    loadAssignedUnitIds(eventId),
    loadUnitParents(),
    loadOpenHoldingUnitByGame(),
  ]);

  const unitId = holdingUnitByGame.get(boardGameId);
  if (!unitId || assignedUnitIds.size === 0) return false;

  return unitOrAncestorAssigned(unitId, assignedUnitIds, parentById);
}

export type AttendingExplainer = {
  meepleId: string;
  displayName: string;
  level: ExplainerExperienceLevel;
};

/** Erklärbären present at this event who can explain this specific game. */
export async function getAttendingExplainers(
  boardGameId: string,
  eventId: string,
): Promise<AttendingExplainer[]> {
  const attendances = await prisma.explainerAttendance.findMany({
    where: { eventId, meeple: { explainerGames: { some: { boardGameId } } } },
    include: {
      meeple: {
        select: {
          id: true,
          displayName: true,
          explainerGames: {
            where: { boardGameId },
            select: { level: true },
          },
        },
      },
    },
  });

  return attendances
    .filter((a) => a.meeple.explainerGames.length > 0)
    .map((a) => ({
      meepleId: a.meeple.id,
      displayName: a.meeple.displayName,
      level: a.meeple.explainerGames[0].level,
    }));
}

/**
 * "Was ist gerade frei" (2.10/3.8) — Zustand "frei" AND "im Raum", filtered by
 * player count. Builds on the existing Ludothek filter logic, no duplicate.
 */
export async function getFreeGamesInRoom(
  eventId: string,
  filters: LudothekFilters,
): Promise<LudothekGame[]> {
  const [games, assignedUnitIds, parentById, holdingUnitByGame] =
    await Promise.all([
      buildLudothekGames(),
      loadAssignedUnitIds(eventId),
      loadUnitParents(),
      loadOpenHoldingUnitByGame(),
    ]);

  const freeGames = filterLudothekGames(games, { ...filters, zustand: "frei" });

  return freeGames.filter((game) => {
    const unitId = holdingUnitByGame.get(game.id);
    if (!unitId) return false;
    return unitOrAncestorAssigned(unitId, assignedUnitIds, parentById);
  });
}

export type GuestFleaMarketItem = {
  id: string;
  title: string;
  description: string | null;
  priceEuros: number;
  status: FleaMarketItemStatus;
};

const GUEST_VISIBLE_STATUSES: FleaMarketItemStatus[] = ["FOR_SALE", "RESERVED"];

/**
 * Flea market items visible in the guest area: never PENDING (not yet approved)
 * and SOLD items are hidden too, since they can no longer be bought (CONTEXT.md
 * "Flohmarkt-Artikel"). A separate, read-only query — no duplicate of the
 * cashier-side query in `src/components/feature/admin-bringbuy/cashier-actions.ts`.
 */
export async function getGuestFleaMarketItems(
  eventId: string,
): Promise<GuestFleaMarketItem[]> {
  const items = await prisma.fleaMarketItem.findMany({
    where: { eventId, status: { in: GUEST_VISIBLE_STATUSES } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      priceEuros: true,
      status: true,
    },
  });
  return items;
}
