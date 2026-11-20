"use server";

import { prisma } from "@/lib/utils/prisma";
import { toResult } from "@/lib/utils/action-result";
import {
  borrowGame,
  confirmHolding,
  handOverGame,
  HoldingConflictError,
  relocateGame,
  returnGame,
} from "@/lib/ludothek/holdings";
import { handOverToExternal } from "@/lib/ludothek/holdings-external";
import {
  ANONYMER_MEEPLE_NAME,
  findAnonymerMeepleMember,
} from "@/lib/ludothek/anonymer-meeple";
import {
  requireActingMeeple,
  requireMemberForMeeple,
  requireOwnMember,
  toResultAndRevalidate,
} from "@/lib/ludothek/holding-actions-shared";
import {
  decideReceive,
  decideTransfer,
  pickCopyForMode,
  type ReceiveDecision,
  type ResolvedScannerTarget,
  type ScannerMode,
  type ScannerOutcome,
  type ScannerTarget,
  type TransferDecision,
} from "@/lib/ludothek/scanner-dispatch";

/**
 * Server Actions der Scanner-Serien (#537): laden Exemplar + offenen
 * Aufenthalt, lassen `scanner-dispatch.ts` die Buchung wählen und führen sie
 * über die Domänenfunktionen aus. Guards laufen über `requireActingMeeple()`
 * — ein ausgetretenes Mitglied löst nie eine Buchung aus (Vier-Augen-Prinzip).
 */

async function loadCopy(gameCopyId: string) {
  const copy = await prisma.gameCopy.findUnique({
    where: { id: gameCopyId },
    select: {
      id: true,
      status: true,
      inventoryNumber: true,
      boardGame: { select: { title: true, slug: true } },
      holdings: {
        where: { endedAt: null },
        take: 1,
        select: {
          id: true,
          unitId: true,
          vereinsmitgliedId: true,
          origin: true,
          confirmedAt: true,
        },
      },
    },
  });
  if (!copy) {
    throw new HoldingConflictError(`Exemplar ${gameCopyId} nicht gefunden.`);
  }
  return { ...copy, holding: copy.holdings[0] ?? null };
}

type LoadedCopy = Awaited<ReturnType<typeof loadCopy>>;

function outcomeFor<O extends ReceiveDecision | TransferDecision>(
  copy: LoadedCopy,
  outcome: O,
  holding: { confirmedAt: Date | null } | null,
): ScannerOutcome<O> {
  return {
    gameCopyId: copy.id,
    outcome,
    confirmed: Boolean(holding?.confirmedAt),
    title: copy.boardGame.title,
    inventoryNumber: copy.inventoryNumber,
    boardGameSlug: copy.boardGame.slug,
  };
}

/** Modus „Erhalten": das gescannte Exemplar landet bestätigt bei mir. */
export async function scanReceiveGame(gameCopyId: string) {
  const { meeple, member } = await requireActingMeeple();

  return toResultAndRevalidate(
    async (): Promise<ScannerOutcome<ReceiveDecision>> => {
      const own = requireOwnMember(member);
      const copy = await loadCopy(gameCopyId);
      const decision = decideReceive(copy, { memberId: own.id });
      const recordedByMeepleId = meeple.id;

      switch (decision) {
        case "already-mine":
          return outcomeFor(copy, decision, copy.holding);
        case "confirm":
          return outcomeFor(
            copy,
            decision,
            await confirmHolding({
              holdingId: copy.holding!.id,
              confirmingVereinsmitgliedId: own.id,
            }),
          );
        case "borrow":
          return outcomeFor(
            copy,
            decision,
            await borrowGame({
              gameCopyId,
              vereinsmitgliedId: own.id,
              recordedByMeepleId,
              isSelf: true,
            }),
          );
        case "handover":
        case "take-over-return":
          return outcomeFor(
            copy,
            decision,
            await handOverGame({
              gameCopyId,
              toVereinsmitgliedId: own.id,
              recordedByMeepleId,
              isSelf: true,
            }),
          );
      }
    },
  );
}

async function requireAnonymerMeeple() {
  const anonymerMeeple = await findAnonymerMeepleMember();
  if (!anonymerMeeple) {
    throw new HoldingConflictError(
      `Sammelkonto "${ANONYMER_MEEPLE_NAME}" fehlt — bitte den Seed erneut ausführen.`,
    );
  }
  return anonymerMeeple;
}

async function resolveTarget(
  target: ScannerTarget,
): Promise<ResolvedScannerTarget> {
  if (target.kind === "unit") return target;
  if (target.kind === "external") return target;
  const toMember = await requireMemberForMeeple(target.meepleId);
  return { kind: "member", memberId: toMember.id, intent: target.intent };
}

/** Modus „Übergeben": das gescannte Exemplar landet beim gewählten Ziel. */
export async function scanTransferGame(
  gameCopyId: string,
  target: ScannerTarget,
) {
  const { meeple, member } = await requireActingMeeple();

  return toResultAndRevalidate(
    async (): Promise<ScannerOutcome<TransferDecision>> => {
      const resolved = await resolveTarget(target);
      const copy = await loadCopy(gameCopyId);
      const decision = decideTransfer(copy, resolved, {
        memberId: member?.id ?? null,
      });
      const recordedByMeepleId = meeple.id;
      const book = (holding: { confirmedAt: Date | null }) =>
        outcomeFor(copy, decision, holding);

      if (decision === "already-there") return book(copy.holding!);

      if (resolved.kind === "unit") {
        const args = {
          gameCopyId,
          toUnitId: resolved.unitId,
          recordedByMeepleId,
        };
        return book(
          decision === "relocate"
            ? await relocateGame(args)
            : await returnGame(args),
        );
      }

      if (resolved.kind === "external") {
        return book(
          await handOverToExternal({
            gameCopyId,
            externalName: resolved.externalName,
            anonymerMeepleVereinsmitgliedId: (await requireAnonymerMeeple()).id,
            recordedByMeepleId,
          }),
        );
      }

      const viaTargetQrScan =
        target.kind === "meeple" ? target.viaTargetQrScan : false;
      const toVereinsmitgliedId = resolved.memberId;
      return book(
        decision === "return-to-person"
          ? await returnGame({
              gameCopyId,
              toVereinsmitgliedId,
              recordedByMeepleId,
              viaTargetQrScan,
            })
          : await handOverGame({
              gameCopyId,
              toVereinsmitgliedId,
              recordedByMeepleId,
              isSelf: false,
              viaTargetQrScan,
            }),
      );
    },
  );
}

/**
 * Prüft ein Personen-Ziel sofort beim Ziel-Scan bzw. bei der Auswahl —
 * ausgetreten, ich selbst oder kein Vereinsmitglied → „Ziel ungültig".
 */
export async function scanValidateTarget(meepleId: string) {
  const { member } = await requireActingMeeple();

  return toResult(async () => {
    let target: { id: string };
    try {
      target = await requireMemberForMeeple(meepleId);
    } catch (error) {
      if (error instanceof HoldingConflictError) {
        throw new HoldingConflictError(`Ziel ungültig — ${error.message}`);
      }
      throw error;
    }
    if (target.id === member?.id) {
      throw new HoldingConflictError(
        "Ziel ungültig — an dich selbst kannst du nicht übergeben.",
      );
    }
    const meeple = await prisma.meeple.findUnique({
      where: { id: meepleId },
      select: { id: true, displayName: true },
    });
    return { meepleId, displayName: meeple?.displayName ?? "" };
  });
}

/**
 * Vorauswahl bei mehrdeutiger EAN (#537): wählt serverseitig — dort sind
 * eigenes Vereinsmitglied und Aufenthalte bekannt — genau ein Exemplar aus
 * oder liefert `null` (→ Exemplar-Auswahl in der UI).
 */
export async function scanPickCopy(
  gameCopyIds: string[],
  mode: ScannerMode,
  target?: ScannerTarget | null,
): Promise<string | null> {
  const { member } = await requireActingMeeple();

  const copies = await prisma.gameCopy.findMany({
    where: { id: { in: gameCopyIds } },
    select: {
      id: true,
      needsCompletenessCheck: true,
      holdings: {
        where: { endedAt: null },
        take: 1,
        select: { unitId: true, vereinsmitgliedId: true },
      },
    },
  });

  let pickTarget: { unitId: string } | { memberId: string } | null = null;
  if (target?.kind === "unit") pickTarget = { unitId: target.unitId };
  if (target?.kind === "meeple") {
    const targetMember = await prisma.member.findUnique({
      where: { meepleId: target.meepleId },
      select: { id: true },
    });
    if (targetMember) pickTarget = { memberId: targetMember.id };
  }

  const picked = pickCopyForMode(
    copies.map((copy) => ({ ...copy, holding: copy.holdings[0] ?? null })),
    mode,
    { ownMemberId: member?.id ?? null, target: pickTarget },
  );
  return picked?.id ?? null;
}
