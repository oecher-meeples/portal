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
  return findAssignedAncestor(unitId, assignedUnitIds, parentById) !== null;
}

/** Same walk as `unitOrAncestorAssigned`, but returns which assigned unit
 * matched — the shelf to point a guest at, not just a yes/no (#121). */
export function findAssignedAncestor(
  unitId: string,
  assignedUnitIds: Set<string>,
  parentById: Map<string, string | null>,
): string | null {
  let currentId: string | null = unitId;
  let depth = 0;

  while (currentId && depth < MAX_UNIT_CHAIN_DEPTH) {
    if (assignedUnitIds.has(currentId)) return currentId;
    currentId = parentById.get(currentId) ?? null;
    depth += 1;
  }

  return null;
}

/**
 * Die Event-`StorageUnit` für `eventId` (#273) — `null`, solange noch
 * niemand ein Exemplar dorthin gebucht hat (die Unit wird lazy per
 * `ensureEventUnit()` erzeugt, nicht hier). Ersetzt `EventShelfAssignment`
 * als Grundlage der "im Raum"-Frage für dieses gesamte Modul.
 */
async function resolveEventUnitId(eventId: string): Promise<string | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { slug: true },
  });
  if (!event) return null;

  const unit = await prisma.storageUnit.findUnique({
    where: { code: `OM-EVENT-${event.slug}` },
    select: { id: true },
  });
  return unit?.id ?? null;
}

async function loadUnitParents() {
  const units = await prisma.storageUnit.findMany({
    select: { id: true, parentUnitId: true },
  });
  return new Map(units.map((u) => [u.id, u.parentUnitId]));
}

async function loadUnitLabels() {
  const units = await prisma.storageUnit.findMany({
    select: { id: true, label: true },
  });
  return new Map(units.map((u) => [u.id, u.label]));
}

async function loadOpenHoldingUnitByGame() {
  const holdings = await prisma.gameHolding.findMany({
    where: { endedAt: null, unitId: { not: null } },
    select: { gameCopyId: true, unitId: true },
  });
  return new Map(holdings.map((h) => [h.gameCopyId, h.unitId as string]));
}

/**
 * "Im Raum" = die Ahnenkette der Holding-Unit des Exemplars erreicht die
 * Event-`StorageUnit` (#273) — deckt Stufe 1 (direkt auf der Event-Unit,
 * "Sammel-Platz") und Stufe 2 (auf einem Regal, das unter die Event-Unit
 * gehängt wurde) gleichermaßen ab, ohne separate Zuordnungstabelle. Kein
 * Zeit-Gate an `event.endsAt` — ein Exemplar, das nach Event-Ende noch auf
 * der Event-Unit liegt, gilt bewusst weiterhin als "im Raum" (liegengebliebene
 * Rückgabe soll auffallen, nicht still verschwinden). A copy held directly by
 * a person (loaned out) is never in the room.
 */
export async function isGameInEventRoom(gameCopyId: string, eventId: string) {
  const [eventUnitId, parentById, holdingUnitByGame] = await Promise.all([
    resolveEventUnitId(eventId),
    loadUnitParents(),
    loadOpenHoldingUnitByGame(),
  ]);

  const unitId = holdingUnitByGame.get(gameCopyId);
  if (!unitId || !eventUnitId) return false;

  return unitOrAncestorAssigned(unitId, new Set([eventUnitId]), parentById);
}

/**
 * GameCopy-Ids, die gerade "im Raum" von `eventId` sind (#273) — Grundlage
 * für den "nur anwesende Spiele"-Filter auf der Ludothek-Übersichtsseite
 * (bisher gab's die Anwesenheits-Frage nur auf der Detailseite/-Lookup, via
 * `isGameInEventRoom()`/`getGuestCopyAvailability()`). Leeres Set, solange
 * das Event keine Unit hat (niemand hat eingecheckt).
 */
export async function getPresentGameCopyIds(
  eventId: string,
): Promise<Set<string>> {
  const [eventUnitId, parentById, holdingUnitByGame] = await Promise.all([
    resolveEventUnitId(eventId),
    loadUnitParents(),
    loadOpenHoldingUnitByGame(),
  ]);
  if (!eventUnitId) return new Set();
  const assignedUnitIds = new Set([eventUnitId]);

  const present = new Set<string>();
  for (const [gameCopyId, unitId] of holdingUnitByGame) {
    if (unitOrAncestorAssigned(unitId, assignedUnitIds, parentById)) {
      present.add(gameCopyId);
    }
  }
  return present;
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
  const [games, eventUnitId, parentById, holdingUnitByGame] = await Promise.all(
    [
      buildLudothekGames(),
      resolveEventUnitId(eventId),
      loadUnitParents(),
      loadOpenHoldingUnitByGame(),
    ],
  );
  if (!eventUnitId) return [];
  const assignedUnitIds = new Set([eventUnitId]);

  const freeGames = filterLudothekGames(games, { ...filters, zustand: "frei" });

  return freeGames.filter((game) => {
    const unitId = holdingUnitByGame.get(game.id);
    if (!unitId) return false;
    return unitOrAncestorAssigned(unitId, assignedUnitIds, parentById);
  });
}

export type GuestCopyAvailability =
  | { kind: "plain"; total: number }
  | {
      kind: "event";
      total: number;
      /** Present at the event ("im Raum", via Regal-Zuordnung). */
      inRoom: number;
      /** Of those, not currently loaned out. */
      available: number;
      shelfLabels: string[];
    };

/**
 * A title's copy count for guests (2.10) — plain by default, or "X von Y
 * verfügbar (Regal …)" once an event is running and at least one copy is
 * assigned to a shelf there (#121). No per-copy zustand/standort leaks to
 * guests, only this aggregate.
 */
export async function getGuestCopyAvailability(
  copies: Pick<LudothekGame, "id" | "zustand">[],
  eventId: string | null,
): Promise<GuestCopyAvailability> {
  const total = copies.length;
  if (!eventId || total === 0) return { kind: "plain", total };

  const [eventUnitId, parentById, unitLabelById, holdingUnitByGame] =
    await Promise.all([
      resolveEventUnitId(eventId),
      loadUnitParents(),
      loadUnitLabels(),
      loadOpenHoldingUnitByGame(),
    ]);
  if (!eventUnitId) return { kind: "plain", total };
  const assignedUnitIds = new Set([eventUnitId]);

  const inRoom = copies
    .map((copy) => {
      const unitId = holdingUnitByGame.get(copy.id);
      const isInRoom =
        unitId && unitOrAncestorAssigned(unitId, assignedUnitIds, parentById);
      // Regal-Label wenn schon einem Regal zugeordnet (Stufe 2), sonst der
      // Event-Unit-eigene Titel als Sammel-Platz-Label (Stufe 1, #273).
      return isInRoom
        ? { copy, shelfLabel: unitLabelById.get(unitId!) ?? "" }
        : null;
    })
    .filter(
      (entry): entry is { copy: (typeof copies)[number]; shelfLabel: string } =>
        entry !== null,
    );

  if (inRoom.length === 0) return { kind: "plain", total };

  const available = inRoom.filter(
    (entry) => entry.copy.zustand === "frei",
  ).length;
  const shelfLabels = [...new Set(inRoom.map((entry) => entry.shelfLabel))];

  return {
    kind: "event",
    total,
    inRoom: inRoom.length,
    available,
    shelfLabels,
  };
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
