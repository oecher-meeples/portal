import {
  GameInventoryStatus,
  HoldingOrigin,
  type GameHolding,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  GameDeinventarisedError,
  GameNotFoundError,
  HoldingConflictError,
  UnitNotFoundError,
  UnitRetiredError,
} from "@/lib/ludothek/errors";

type Tx = PrismaClient | Prisma.TransactionClient;

/** Whether a Meeple currently has any open, unconfirmed handover/return
 * waiting on them (#290) — backs the Ludothek "meine Ausleihen"-Filters
 * Hinweis-Banner, das auf das Dashboard zurückverweist, wo die eigentliche
 * Bestätigen-Aktion sitzt (dort keine eigene, siehe Issue-Entscheidung). */
export async function hasUnconfirmedHoldingsForMeeple(
  meepleId: string,
): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { id: true },
  });
  if (!member) return false;

  const count = await prisma.gameHolding.count({
    where: {
      vereinsmitgliedId: member.id,
      endedAt: null,
      confirmedAt: null,
    },
  });
  return count > 0;
}

export async function requireOpenHolding(tx: Tx, gameCopyId: string) {
  const holding = await tx.gameHolding.findFirst({
    where: { gameCopyId, endedAt: null },
  });
  if (!holding) {
    throw new HoldingConflictError(
      `Exemplar ${gameCopyId} hat keinen offenen Aufenthalt — das darf laut Datenmodell nicht vorkommen.`,
    );
  }
  return holding;
}

async function requireActiveCopy(tx: Tx, gameCopyId: string) {
  const copy = await tx.gameCopy.findUnique({ where: { id: gameCopyId } });
  if (!copy) {
    throw new GameNotFoundError(gameCopyId);
  }
  return copy;
}

async function requireOpenUnit(tx: Tx, unitId: string) {
  const unit = await tx.storageUnit.findUnique({ where: { id: unitId } });
  if (!unit) {
    throw new UnitNotFoundError(unitId);
  }
  if (unit.retiredAt) {
    throw new UnitRetiredError(unitId);
  }
  return unit;
}

export async function closeAndOpen(
  tx: Tx,
  {
    gameCopyId,
    previous,
    target,
    origin,
    recordedByMeepleId,
    confirmedAt,
    note,
  }: {
    gameCopyId: string;
    previous: GameHolding;
    target: { unitId: string } | { vereinsmitgliedId: string };
    origin: HoldingOrigin;
    recordedByMeepleId: string;
    confirmedAt: Date | null;
    note?: string | null;
  },
) {
  const now = new Date();
  await tx.gameHolding.update({
    where: { id: previous.id },
    data: { endedAt: now },
  });

  return tx.gameHolding.create({
    data: {
      gameCopyId,
      ...target,
      origin,
      startedAt: now,
      confirmedAt,
      recordedByMeepleId,
      note: note ?? null,
    },
  });
}

/**
 * Whoever records the transition as the receiving party gets it confirmed
 * right away — and so does anyone holding `games:manage` (#274): "der
 * Spielewart ist von dieser Regel ausgenommen: sein Wort ist Gesetz", for
 * any recipient, regardless of prior possession. `isSelf` is resolved by the
 * caller (holding-actions.ts), not looked up here — since the domain layer
 * works with `Member` targets (#333), while "acting as the receiver" is a
 * question about the acting *Meeple's* identity, which only the caller
 * (already holding both identities) can answer without a Meeple↔Member
 * lookup leaking into this fachfrei-vereinsmitglied module. Used by
 * `borrowGame` and `handOverGame` alike; `confirmHolding()` (forcing an
 * already-open, foreign assignment after the fact) is a separate concern and
 * stays untouched.
 */
async function confirmationFor(
  tx: Tx,
  recordedByMeepleId: string,
  isSelf: boolean,
  /** #465: die abgebende Person hat den persönlichen QR-Code der
   * empfangenden Person gescannt (`resolveScannedCode()`, `kind: "meeple"`)
   * — das Scannen ist der Bestätigungsnachweis, unabhängig davon, wer den
   * Vorgang technisch verbucht (`recordedByMeepleId`) oder ob diese Person
   * `games:manage` hat. */
  viaTargetQrScan = false,
) {
  if (isSelf || viaTargetQrScan) {
    return new Date();
  }

  const recorder = await tx.meeple.findUnique({
    where: { id: recordedByMeepleId },
    select: { neonAuthUserId: true },
  });
  if (!recorder?.neonAuthUserId) {
    return null;
  }

  const grantCount = await tx.rolePermission.count({
    where: {
      permission: { key: "games:manage" },
      role: { users: { some: { neonAuthUserId: recorder.neonAuthUserId } } },
    },
  });
  return grantCount > 0 ? new Date() : null;
}

/**
 * A holding counts as a loan exactly when it targets a Vereinsmitglied via
 * LOAN or HANDOVER — a RETURN to a person is explicitly not a loan (see
 * CONTEXT.md "Ausleihe").
 */
export function isLoanHolding(
  holding: Pick<GameHolding, "vereinsmitgliedId" | "origin">,
) {
  return (
    holding.vereinsmitgliedId !== null &&
    (holding.origin === HoldingOrigin.LOAN ||
      holding.origin === HoldingOrigin.HANDOVER)
  );
}

export async function borrowGame({
  gameCopyId,
  vereinsmitgliedId,
  recordedByMeepleId,
  isSelf,
  note,
}: {
  gameCopyId: string;
  vereinsmitgliedId: string;
  recordedByMeepleId: string;
  /** True wenn die erfassende und die empfangende Identität dieselbe Person
   * sind (der Regelfall: ein Meeple bucht auf sein eigenes Vereinsmitglied
   * aus) — vom Aufrufer aufgelöst, siehe `confirmationFor()`. */
  isSelf: boolean;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const copy = await requireActiveCopy(tx, gameCopyId);
    if (copy.status === GameInventoryStatus.DEINVENTARISED) {
      throw new GameDeinventarisedError(gameCopyId);
    }

    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.unitId) {
      throw new HoldingConflictError(
        "Nur ein Spiel in einer Aufbewahrungseinheit kann ausgeliehen werden — dieses liegt bereits bei einer Person.",
      );
    }

    return closeAndOpen(tx, {
      gameCopyId,
      previous,
      target: { vereinsmitgliedId },
      origin: HoldingOrigin.LOAN,
      recordedByMeepleId,
      confirmedAt: await confirmationFor(tx, recordedByMeepleId, isSelf),
      note,
    });
  });
}

export async function handOverGame({
  gameCopyId,
  toVereinsmitgliedId,
  recordedByMeepleId,
  isSelf,
  viaTargetQrScan,
  note,
}: {
  gameCopyId: string;
  toVereinsmitgliedId: string;
  recordedByMeepleId: string;
  isSelf: boolean;
  /** #465: Ziel wurde über den persönlichen QR-Code der empfangenden
   * Person aufgelöst — löst dieselbe Sofort-Bestätigung wie `isSelf` aus. */
  viaTargetQrScan?: boolean;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.vereinsmitgliedId) {
      throw new HoldingConflictError(
        "Weitergeben kann nur, wer das Spiel gerade selbst bei sich hat — es liegt aktuell in einer Einheit.",
      );
    }

    return closeAndOpen(tx, {
      gameCopyId,
      previous,
      target: { vereinsmitgliedId: toVereinsmitgliedId },
      origin: HoldingOrigin.HANDOVER,
      recordedByMeepleId,
      confirmedAt: await confirmationFor(
        tx,
        recordedByMeepleId,
        isSelf,
        viaTargetQrScan,
      ),
      note,
    });
  });
}

export async function returnGame({
  gameCopyId,
  toUnitId,
  toVereinsmitgliedId,
  recordedByMeepleId,
  viaTargetQrScan = false,
  note,
}: {
  gameCopyId: string;
  recordedByMeepleId: string;
  /** #465: Ziel wurde über den persönlichen QR-Code der annehmenden Person
   * aufgelöst — die Rückgabe gilt dann sofort als bestätigt, ohne dass die
   * Person sie selbst noch einlagern/bestätigen muss. Nur relevant für
   * `toVereinsmitgliedId`, ignoriert bei `toUnitId` (dort ist "liegt in der
   * Einheit" ohnehin schon die Bestätigung). */
  viaTargetQrScan?: boolean;
  note?: string | null;
} & (
  | { toUnitId: string; toVereinsmitgliedId?: never }
  | { toVereinsmitgliedId: string; toUnitId?: never }
)) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.vereinsmitgliedId) {
      throw new HoldingConflictError(
        "Zurückgeben kann nur, was gerade bei einer Person liegt — dieses Spiel liegt bereits in einer Einheit.",
      );
    }

    if (toUnitId) {
      await requireOpenUnit(tx, toUnitId);
      return closeAndOpen(tx, {
        gameCopyId,
        previous,
        target: { unitId: toUnitId },
        origin: HoldingOrigin.RETURN,
        recordedByMeepleId,
        // Being in a unit is itself the confirmation — see CONTEXT.md "Rückgabe".
        confirmedAt: new Date(),
        note,
      });
    }

    return closeAndOpen(tx, {
      gameCopyId,
      previous,
      target: { vereinsmitgliedId: toVereinsmitgliedId! },
      origin: HoldingOrigin.RETURN,
      recordedByMeepleId,
      // Only completed once the accepting person actually stores it away
      // (einlagern) — or, for a return from someone with no reachable Meeple
      // login ("nicht verfügbar", #333c/d), via `confirmExternalReturn()`.
      // #465: Ausnahme, wenn das Ziel per persönlichem QR-Code der Person
      // selbst aufgelöst wurde — das Scannen ist dann der Nachweis.
      confirmedAt: viaTargetQrScan ? new Date() : null,
      note,
    });
  });
}

export async function relocateGame({
  gameCopyId,
  toUnitId,
  recordedByMeepleId,
  note,
}: {
  gameCopyId: string;
  toUnitId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.unitId) {
      throw new HoldingConflictError(
        "Umlagern gilt nur für Spiele, die bereits in einer Einheit liegen — dieses ist ausgeliehen.",
      );
    }

    await requireOpenUnit(tx, toUnitId);

    return closeAndOpen(tx, {
      gameCopyId,
      previous,
      target: { unitId: toUnitId },
      origin: HoldingOrigin.RELOCATION,
      recordedByMeepleId,
      // Relocating never creates a stage on the person who moved it.
      confirmedAt: new Date(),
      note,
    });
  });
}

/** Shared by `confirmHolding()` (identity-checked, the receiving person
 * themselves) and `confirmHoldingAsGamesManager()` (permission-checked,
 * #290) — the actual state change and its guards (open, not a RETURN, not
 * already confirmed) are identical, only who's allowed to trigger it
 * differs. */
async function applyHoldingConfirmation(holding: GameHolding) {
  if (holding.endedAt) {
    throw new HoldingConflictError("Dieser Aufenthalt ist nicht mehr offen.");
  }
  if (holding.origin === HoldingOrigin.RETURN) {
    throw new HoldingConflictError(
      "Eine Rückgabe wird nicht per Klick bestätigt, sondern durch Einlagern in eine Einheit — für eine Rückgabe von extern siehe confirmExternalReturn().",
    );
  }
  if (holding.confirmedAt) {
    return holding;
  }

  return prisma.gameHolding.update({
    where: { id: holding.id },
    data: { confirmedAt: new Date() },
  });
}

export async function confirmHolding({
  holdingId,
  confirmingVereinsmitgliedId,
}: {
  holdingId: string;
  confirmingVereinsmitgliedId: string;
}) {
  const holding = await prisma.gameHolding.findUnique({
    where: { id: holdingId },
  });
  if (!holding || holding.endedAt) {
    throw new HoldingConflictError("Dieser Aufenthalt ist nicht mehr offen.");
  }
  if (holding.vereinsmitgliedId !== confirmingVereinsmitgliedId) {
    throw new HoldingConflictError(
      "Nur die empfangende Person kann diesen Aufenthalt bestätigen.",
    );
  }
  return applyHoldingConfirmation(holding);
}

/**
 * "Der Spielewart ist von dieser Regel ausgenommen" (#290, analog #274) —
 * bestätigt eine fremde, bereits offene Übergabe direkt, ohne dass die
 * empfangende Person selbst tätig werden muss. Permission-Check (`games:manage`)
 * ist Sache des Aufrufers (`holding-actions.ts`), diese Funktion selbst kennt
 * keine Berechtigungen (siehe `confirmationFor()` oben für dieselbe
 * Aufgabenteilung).
 */
export async function confirmHoldingAsGamesManager(holdingId: string) {
  const holding = await prisma.gameHolding.findUnique({
    where: { id: holdingId },
  });
  if (!holding) {
    throw new HoldingConflictError("Dieser Aufenthalt ist nicht mehr offen.");
  }
  return applyHoldingConfirmation(holding);
}

export async function moveStorageUnit({
  unitId,
  recordedByMeepleId,
  keeperMeepleId,
  parentUnitId,
  locationNote,
}: {
  unitId: string;
  recordedByMeepleId: string;
  keeperMeepleId?: string | null;
  parentUnitId?: string | null;
  locationNote?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const unit = await requireOpenUnit(tx, unitId);
    const now = new Date();

    await tx.storageUnitMove.updateMany({
      where: { unitId, endedAt: null },
      data: { endedAt: now },
    });

    await tx.storageUnitMove.create({
      data: {
        unitId,
        keeperMeepleId: keeperMeepleId ?? null,
        parentUnitId: parentUnitId ?? null,
        locationNote: locationNote ?? null,
        startedAt: now,
        recordedByMeepleId,
      },
    });

    return tx.storageUnit.update({
      where: { id: unit.id },
      data: {
        keeperMeepleId: keeperMeepleId ?? null,
        parentUnitId: parentUnitId ?? null,
        locationNote: locationNote ?? null,
      },
    });
  });
}

export {
  ensureEventUnit,
  ensureUnsortiertUnit,
  formatLocationChain,
  getGameZustand,
  getResponsibleMeeple,
  isVerfuegbarerVereinsmitglied,
  resolveScannedCode,
  walkUnitChain,
  zustandFromHoldingAndUnit,
  type GameZustand,
  type ResolvedScan,
  type UnitChainNode,
} from "@/lib/ludothek/holdings-lookup";

export {
  GameDeinventarisedError,
  GameNotFoundError,
  HoldingConflictError,
  UnitNotFoundError,
  UnitRetiredError,
};
