import {
  GameInventoryStatus,
  StorageUnitKind,
  type BoardGame,
  type GameCopy,
  type GameHolding,
  type Prisma,
  type PrismaClient,
  type StorageUnit,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { UNSORTIERT_CODE, parseScannedCode } from "@/lib/inventory/codes";
import { HoldingConflictError } from "@/lib/ludothek/errors";

type Tx = PrismaClient | Prisma.TransactionClient;

const MAX_UNIT_CHAIN_DEPTH = 20;

/**
 * "ausgeliehen" hat seit dem Vereinsmitglied/Meeple-Split (#333) zwei
 * Unterfälle: **verfügbar** (das haltende Vereinsmitglied hat ein
 * Portal-Konto — `Member.meepleId` verweist auf ein `Meeple` mit
 * `neonAuthUserId`, ist also über den Scan-Flow selbst erreichbar) vs.
 * **nicht verfügbar** (kein erreichbares Portal-Konto — eine rein extern
 * geführte Person, ein Systemkonto ohne Login, oder das Sammelkonto
 * "Anonymer Meeple"). Bewusste Verschärfung gegenüber der Plan-Formulierung
 * "Member.meepleId !== null": das Sammelkonto HAT ein verknüpftes Meeple,
 * aber ohne Login (`neonAuthUserId: null`) ist es nicht wirklich erreichbar —
 * daher zählt zusätzlich, ob dieses Meeple ein Login hat.
 */
export type GameZustand =
  | "frei"
  | "ausgeliehen-verfuegbar"
  | "ausgeliehen-nicht-verfuegbar"
  | "wartung"
  | "nicht-erfasst"
  /** Privatbesitz-Pseudo-Zustand (#255-Folge) — nie von
   * `zustandFromHoldingAndUnit()` zurückgegeben, nur von
   * `buildPrivateLudothekGames()` gesetzt. */
  | "privat";

export type UnitChainNode = {
  label: string;
  parentUnitId: string | null;
  keeperMeepleId: string | null;
};

/** Walks a unit chain from a leaf up towards the root, stopping at the first
 * keeper found — that person is the pickup orientation point, further
 * ancestor units aren't shown (see #121 Standort-Kette). */
export function walkUnitChain(
  unitId: string,
  unitById: Map<string, UnitChainNode>,
) {
  const labels: string[] = [];
  let keeperMeepleId: string | null = null;
  let currentId: string | null = unitId;
  let depth = 0;

  while (currentId && depth < MAX_UNIT_CHAIN_DEPTH) {
    const unit = unitById.get(currentId);
    if (!unit) break;
    labels.push(unit.label);
    if (unit.keeperMeepleId) {
      keeperMeepleId = unit.keeperMeepleId;
      break;
    }
    currentId = unit.parentUnitId;
    depth += 1;
  }

  return { unitChain: labels.reverse().join(" → "), keeperMeepleId };
}

export type StorageUnitLite = {
  id: string;
  keeperMeepleId: string | null;
};

/**
 * `unitById` for `walkUnitChain()` plus a `keeperMeepleId → displayName`
 * lookup, built from the same `storageUnit.findMany()` result — every bulk
 * Ludothek view (admin-bestand, Ludothek-Browser) needs both maps to resolve
 * a copy's Standort-Kette, so this is the one place that builds them instead
 * of each caller repeating the keeper query.
 */
export async function buildUnitAndKeeperMaps<T extends StorageUnitLite>(
  units: T[],
) {
  const unitById = new Map(units.map((u) => [u.id, u]));
  const keeperIds = [
    ...new Set(
      units
        .map((u) => u.keeperMeepleId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const keepers = keeperIds.length
    ? await prisma.meeple.findMany({
        where: { id: { in: keeperIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const keeperNameById = new Map(keepers.map((k) => [k.id, k.displayName]));

  return { unitById, keeperNameById };
}

/** The one place that decides the display order: person/event first (the
 * pickup orientation point), then the storage units (see #121). */
export function formatLocationChain({
  responsibleName,
  unitChain,
}: {
  responsibleName: string | null;
  unitChain: string;
}) {
  if (!responsibleName) return unitChain;
  return unitChain
    ? `bei ${responsibleName} → ${unitChain}`
    : `bei ${responsibleName}`;
}

/** A physical copy together with its title — what a scan actually resolves to. */
export type ScannedGameCopy = GameCopy & { boardGame: BoardGame };

/** The unit for games whose physical location has never been recorded (see CONTEXT.md). */
export async function ensureUnsortiertUnit(tx: Tx = prisma) {
  return tx.storageUnit.upsert({
    where: { code: UNSORTIERT_CODE },
    update: {},
    create: {
      code: UNSORTIERT_CODE,
      kind: StorageUnitKind.BOX,
      label: "Unsortiert",
    },
  });
}

/**
 * Wurzel des Standort-Baums für die Dauer eines Events (#273) — analog
 * `ensureUnsortiertUnit()`: lazy per Upsert erzeugt, `keeperMeepleId = null`
 * (kein Verwahrer). Code deterministisch aus dem Event-Slug abgeleitet, nicht
 * fortlaufend nummeriert — pro Event genau eine Unit, egal wie oft aufgerufen.
 */
export async function ensureEventUnit(
  event: { slug: string; title: string },
  tx: Tx = prisma,
) {
  const code = `OM-EVENT-${event.slug}`;
  return tx.storageUnit.upsert({
    where: { code },
    update: {},
    create: {
      code,
      kind: StorageUnitKind.EVENT,
      label: event.title,
    },
  });
}

export type ResolvedScan =
  | { kind: "games"; games: ScannedGameCopy[] }
  | { kind: "unit"; unit: StorageUnit; contents: ScannedGameCopy[] }
  | { kind: "unknown"; raw: string };

export async function resolveScannedCode(raw: string): Promise<ResolvedScan> {
  const parsed = parseScannedCode(raw);

  if (parsed.kind === "unit") {
    const unit = await prisma.storageUnit.findUnique({
      where: { code: parsed.value },
    });
    if (!unit) {
      return { kind: "unknown", raw };
    }
    const contents = await prisma.gameCopy.findMany({
      where: { holdings: { some: { unitId: unit.id, endedAt: null } } },
      include: { boardGame: true },
    });
    return { kind: "unit", unit, contents };
  }

  if (parsed.kind === "ean") {
    // The EAN identifies the title, not the individual copy (ADR 0001/0008) —
    // a scan can resolve to several copies of the same title.
    const copies = await prisma.gameCopy.findMany({
      where: {
        boardGame: { ean: parsed.value },
        status: { not: GameInventoryStatus.DEINVENTARISED },
      },
      include: { boardGame: true },
    });
    if (copies.length === 0) {
      return { kind: "unknown", raw };
    }
    return { kind: "games", games: copies };
  }

  return { kind: "unknown", raw };
}

/** Walks Exemplar → Karton → Regal → Meeple, stopping at the first keeper
 * found. NB: the returned id is a `Member` id when a person holds the copy
 * directly, but a `Meeple` id when a unit's keeper is returned — callers that
 * need one specific kind should resolve it themselves instead of using this. */
export async function getResponsibleMeeple(
  copy: Pick<GameCopy, "id">,
): Promise<string | null> {
  const holding = await prisma.gameHolding.findFirst({
    where: { gameCopyId: copy.id, endedAt: null },
  });
  if (!holding) return null;
  if (holding.vereinsmitgliedId) return holding.vereinsmitgliedId;
  if (!holding.unitId) return null;

  let unitId: string | null = holding.unitId;
  for (let depth = 0; unitId && depth < MAX_UNIT_CHAIN_DEPTH; depth++) {
    const unit: StorageUnit | null = await prisma.storageUnit.findUnique({
      where: { id: unitId },
    });
    if (!unit) return null;
    if (unit.keeperMeepleId) return unit.keeperMeepleId;
    unitId = unit.parentUnitId;
  }

  return null;
}

/** Whether the `Member` behind a holding has a reachable portal account —
 * shared by `zustandFromHoldingAndUnit()` and every caller that resolves this
 * itself, so the "verfügbar" rule lives in exactly one place. */
export function isVerfuegbarerVereinsmitglied(
  member: { meeple: { neonAuthUserId: string | null } | null } | null,
): boolean {
  return Boolean(member?.meeple?.neonAuthUserId);
}

/** Pure so bulk views (e.g. admin-bestand) can reuse it without a query per game. */
export function zustandFromHoldingAndUnit(
  holding: Pick<GameHolding, "vereinsmitgliedId">,
  unit: Pick<StorageUnit, "code"> | null,
  gameStatus: GameInventoryStatus,
  vereinsmitglied?: {
    meeple: { neonAuthUserId: string | null } | null;
  } | null,
): GameZustand {
  if (holding.vereinsmitgliedId) {
    return isVerfuegbarerVereinsmitglied(vereinsmitglied ?? null)
      ? "ausgeliehen-verfuegbar"
      : "ausgeliehen-nicht-verfuegbar";
  }
  if (unit?.code === UNSORTIERT_CODE) return "nicht-erfasst";
  if (gameStatus === GameInventoryStatus.MAINTENANCE) return "wartung";
  return "frei";
}

export async function getGameZustand(
  copy: Pick<GameCopy, "id" | "status">,
): Promise<GameZustand> {
  const holding = await prisma.gameHolding.findFirst({
    where: { gameCopyId: copy.id, endedAt: null },
    include: {
      unit: true,
      vereinsmitglied: {
        include: { meeple: { select: { neonAuthUserId: true } } },
      },
    },
  });

  if (!holding) {
    throw new HoldingConflictError(
      `Exemplar ${copy.id} hat keinen offenen Aufenthalt — das darf laut Datenmodell nicht vorkommen.`,
    );
  }
  return zustandFromHoldingAndUnit(
    holding,
    holding.unit,
    copy.status,
    holding.vereinsmitglied,
  );
}
