"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { findActiveShiftEvent } from "@/lib/events/shift-rights";
import {
  borrowGame,
  returnGame,
  resolveScannedCode,
  HoldingConflictError,
  type ResolvedScan,
} from "@/lib/ludothek/holdings";
import {
  listOfferedPrivateLoansForEvent,
  issuePrivateLoan,
  returnPrivateLoan,
  type OfferedPrivateLoan,
} from "@/lib/ludothek/private-event-loans";

/** Muss zum in prisma/migrations/…_add_helper_role gepflegten Rollennamen passen. */
const AUSLEIHE_ROLE_NAME = "Leihe";

/**
 * Re-prüft die Schicht-Bindung unabhängig von der Seite (#121) — Server
 * Actions dürfen sich nie darauf verlassen, dass der Aufruf nur über die
 * geschützte Seite erfolgt (analog requireCashierRights, ADR-0006).
 */
async function requireAusleiheMeeple() {
  const { meeple } = await requireAusleiheShift();
  return meeple;
}

/** Wie `requireAusleiheMeeple()`, liefert zusätzlich die Event-ID der
 * aktiven Schicht — für die private Ausleihe (#122), die anders als die
 * Vereinsbestand-Aktionen event-, nicht exemplar-gebunden ist. */
async function requireAusleiheShift() {
  const meeple = await requireMeeple();
  const activeShift = await findActiveShiftEvent(meeple.id, AUSLEIHE_ROLE_NAME);
  if (!activeShift) {
    throw new HoldingConflictError(
      "Keine aktive Ausleihe-Schicht — diese Seite ist nur während einer besetzten Ausleihe-Schicht nutzbar.",
    );
  }
  return { meeple, eventId: activeShift.eventId };
}

async function toResult(run: () => Promise<unknown>) {
  try {
    await run();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unbekannter Fehler.",
    };
  }
}

export async function ausleiheResolveCode(raw: string): Promise<ResolvedScan> {
  await requireAusleiheMeeple();
  try {
    return await resolveScannedCode(raw);
  } catch {
    return { kind: "unknown", raw };
  }
}

export type CopyAvailability =
  | { kind: "available" }
  | {
      kind: "on-loan";
      previousUnit: { id: string; code: string; label: string } | null;
    };

/**
 * Ob ein gescanntes Exemplar gerade an einem Regal liegt (→ Ausgabe möglich)
 * oder bei jemandem ausgeliehen ist (→ Rückgabe-Flow), plus für die Rückgabe
 * der zuletzt bekannte Regal-Standort (letzter beendeter Aufenthalt mit
 * `unitId`), sofern die Einheit noch existiert und nicht stillgelegt ist.
 */
export async function ausleiheGetAvailability(
  gameCopyId: string,
): Promise<CopyAvailability | null> {
  await requireAusleiheMeeple();

  const holding = await prisma.gameHolding.findFirst({
    where: { gameCopyId, endedAt: null },
  });
  if (!holding) return null;

  if (!holding.vereinsmitgliedId) {
    return { kind: "available" };
  }

  const previous = await prisma.gameHolding.findFirst({
    where: { gameCopyId, unitId: { not: null }, endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
    include: { unit: true },
  });

  const unit = previous?.unit;
  return {
    kind: "on-loan",
    previousUnit:
      unit && !unit.retiredAt
        ? { id: unit.id, code: unit.code, label: unit.label }
        : null,
  };
}

/**
 * Ausgabe an einen Event-Gast (#121) — der Gast selbst ist im Datenmodell
 * nicht abbildbar (kein Meeple-Konto), daher bucht das Ausleihe-Meeple wie
 * bei der regulären scanBorrowGame-Ausleihe auf sich selbst aus; siehe
 * CONTEXT.md "Ausleiher".
 */
export async function ausleiheIssueGame(gameCopyId: string) {
  const result = await toResult(async () => {
    const meeple = await requireAusleiheMeeple();
    const member = await prisma.member.findUnique({
      where: { meepleId: meeple.id },
      select: { id: true },
    });
    if (!member) {
      throw new HoldingConflictError(
        "Dieses Konto ist mit keinem Vereinsmitglied verknüpft — Ausgabe an einen Gast ist nur für Vereinsmitglieder möglich.",
      );
    }
    return borrowGame({
      gameCopyId,
      vereinsmitgliedId: member.id,
      recordedByMeepleId: meeple.id,
      isSelf: true,
    });
  });
  if ("success" in result) revalidatePath("/ausleihe");
  return result;
}

export async function ausleiheReturnToUnit(gameCopyId: string, unitId: string) {
  const result = await toResult(async () => {
    const meeple = await requireAusleiheMeeple();
    return returnGame({
      gameCopyId,
      toUnitId: unitId,
      recordedByMeepleId: meeple.id,
    });
  });
  if ("success" in result) revalidatePath("/ausleihe");
  return result;
}

/** Private Exemplare (#122), die für die laufende Ausleihe-Schicht zur
 * Ausgabe angeboten wurden — separat von der Scanner-Liste, da private
 * Exemplare keinen EAN/Einheiten-Code haben. */
export async function ausleiheListOfferedPrivateLoans(): Promise<
  OfferedPrivateLoan[]
> {
  const { eventId } = await requireAusleiheShift();
  return listOfferedPrivateLoansForEvent(eventId);
}

export async function ausleiheIssuePrivateLoan(loanId: string) {
  const result = await toResult(async () => {
    const { meeple } = await requireAusleiheShift();
    const outcome = await issuePrivateLoan(loanId, meeple.id);
    if ("error" in outcome) throw new HoldingConflictError(outcome.error);
  });
  if ("success" in result) revalidatePath("/ausleihe");
  return result;
}

export async function ausleiheReturnPrivateLoan(loanId: string) {
  const result = await toResult(async () => {
    await requireAusleiheShift();
    const outcome = await returnPrivateLoan(loanId);
    if ("error" in outcome) throw new HoldingConflictError(outcome.error);
  });
  if ("success" in result) revalidatePath("/ausleihe");
  return result;
}
