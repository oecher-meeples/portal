import {
  GameInventoryStatus,
  HoldingOrigin,
  type GameHolding,
} from "@prisma/client";
import {
  GameDeinventarisedError,
  HoldingConflictError,
} from "@/lib/ludothek/errors";

/**
 * Buchungs-Weiche der Scanner-Serien (#537, Epic #536): welche Domänen-
 * Buchung ein gescanntes Exemplar im Modus „Erhalten" bzw. „Übergeben"
 * auslöst. Rein und ohne DB — die Server Actions (`scanner-actions.ts`)
 * laden Aufenthalt und Ziel und führen die hier gewählte Buchung aus.
 */

/** Ziel einer Übergabe-Serie, wie die UI es kennt (Meeple-Ids, nicht Member). */
export type ScannerTarget =
  | { kind: "unit"; unitId: string }
  | {
      kind: "meeple";
      meepleId: string;
      intent: "handover" | "return";
      /** #465: Ziel per persönlichem QR-Code gescannt → sofort bestätigt. */
      viaTargetQrScan: boolean;
    }
  | { kind: "external"; externalName: string };

/** Ziel nach Auflösung der Meeple-Id auf das Vereinsmitglied (Server-Seite). */
export type ResolvedScannerTarget =
  | { kind: "unit"; unitId: string }
  | { kind: "member"; memberId: string; intent: "handover" | "return" }
  | { kind: "external"; externalName: string };

type HoldingFacts = Pick<
  GameHolding,
  "unitId" | "vereinsmitgliedId" | "origin" | "confirmedAt"
>;

type CopyFacts = {
  id: string;
  status: GameInventoryStatus;
  holding: HoldingFacts | null;
};

export type ReceiveDecision =
  "borrow" | "handover" | "take-over-return" | "confirm" | "already-mine";

export type TransferDecision =
  | "return-to-unit"
  | "relocate"
  | "already-there"
  | "handover"
  | "return-to-person"
  | "external";

/** Ergebnis pro Exemplar fürs Serien-Log der UI. */
export type ScannerOutcome = {
  gameCopyId: string;
  outcome: ReceiveDecision | TransferDecision;
  /** Ob der entstandene (bzw. bestehende) Aufenthalt bestätigt ist. */
  confirmed: boolean;
  title: string;
  inventoryNumber: number | null;
  /** Für den Link `/ludothek/<slug>/inv-<n>` (Korrektur per Gegenbuchung). */
  boardGameSlug: string;
};

function requireBookableHolding(copy: CopyFacts): HoldingFacts {
  if (copy.status === GameInventoryStatus.DEINVENTARISED) {
    throw new GameDeinventarisedError(copy.id);
  }
  if (!copy.holding) {
    throw new HoldingConflictError(
      `Exemplar ${copy.id} hat keinen offenen Aufenthalt.`,
    );
  }
  return copy.holding;
}

/** Modus „Erhalten": das Exemplar soll danach bestätigt bei mir liegen. */
export function decideReceive(
  copy: CopyFacts,
  actor: { memberId: string },
): ReceiveDecision {
  const holding = requireBookableHolding(copy);
  if (holding.unitId) return "borrow";
  if (holding.vereinsmitgliedId !== actor.memberId) return "handover";
  // `confirmHolding` wirft bei RETURN — mir zum Einlagern zurückgegeben,
  // jetzt übernehme ich es als Ausleihe.
  if (holding.origin === HoldingOrigin.RETURN) return "take-over-return";
  return holding.confirmedAt ? "already-mine" : "confirm";
}

const IN_UNIT_CANNOT_HAND_OVER =
  "Weitergeben kann nur, wer das Spiel gerade selbst bei sich hat — es liegt aktuell in einer Einheit.";

/** Modus „Übergeben": das Exemplar soll danach beim Ziel liegen. */
export function decideTransfer(
  copy: CopyFacts,
  target: ResolvedScannerTarget,
  actor: { memberId: string | null },
): TransferDecision {
  if (target.kind === "member" && target.memberId === actor.memberId) {
    throw new HoldingConflictError(
      "Ziel ungültig — an dich selbst kannst du nicht übergeben.",
    );
  }
  const holding = requireBookableHolding(copy);

  if (target.kind === "unit") {
    if (holding.unitId === target.unitId) return "already-there";
    return holding.unitId ? "relocate" : "return-to-unit";
  }
  if (target.kind === "external") {
    if (holding.unitId)
      throw new HoldingConflictError(IN_UNIT_CANNOT_HAND_OVER);
    return "external";
  }
  if (holding.vereinsmitgliedId === target.memberId) return "already-there";
  return target.intent === "return" ? "return-to-person" : "handover";
}

export type ScannerMode = "receive" | "transfer" | "mark" | "check";

export type CopyCandidate = {
  id: string;
  holding: Pick<GameHolding, "unitId" | "vereinsmitgliedId"> | null;
  needsCompletenessCheck: boolean;
};

export type PickContext = {
  ownMemberId: string | null;
  /** Nur für „transfer": wo das Exemplar danach liegen soll. */
  target?: { unitId: string } | { memberId: string } | null;
};

function isAtTarget(
  copy: CopyCandidate,
  target: PickContext["target"],
): boolean {
  if (!target || !copy.holding) return false;
  return "unitId" in target
    ? copy.holding.unitId === target.unitId
    : copy.holding.vereinsmitgliedId === target.memberId;
}

function isWithMe(copy: CopyCandidate, ownMemberId: string | null) {
  return (
    ownMemberId !== null && copy.holding?.vereinsmitgliedId === ownMemberId
  );
}

function single<T>(items: T[]): T | null {
  return items.length === 1 ? items[0] : null;
}

/**
 * Vorauswahl bei mehrdeutiger EAN (#537): liefert genau ein Exemplar oder
 * `null` (→ Exemplar-Auswahl in der UI).
 */
export function pickCopyForMode<T extends CopyCandidate>(
  copies: T[],
  mode: ScannerMode,
  ctx: PickContext,
): T | null {
  if (copies.length === 1) return copies[0];

  switch (mode) {
    case "receive":
      return single(copies.filter((c) => !isWithMe(c, ctx.ownMemberId)));
    case "transfer": {
      const candidates = copies.filter((c) => !isAtTarget(c, ctx.target));
      return (
        single(candidates) ??
        single(candidates.filter((c) => isWithMe(c, ctx.ownMemberId)))
      );
    }
    case "mark":
      return single(copies.filter((c) => !c.needsCompletenessCheck));
    case "check":
      return single(copies.filter((c) => c.needsCompletenessCheck));
  }
}
