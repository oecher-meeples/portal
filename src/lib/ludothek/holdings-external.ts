import { HoldingOrigin } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { HoldingConflictError } from "@/lib/ludothek/errors";
import { closeAndOpen, requireOpenHolding } from "@/lib/ludothek/holdings";
import { isVerfuegbarerVereinsmitglied } from "@/lib/ludothek/holdings-lookup";

/**
 * "An extern weitergegeben" (#333b): self-service, jedes Meeple kann sein
 * eigenes Exemplar an eine Freitext-benannte externe Person weitergeben, ohne
 * dass diese im Portal existiert.
 *
 * Modellierungsentscheidung (bewusste Abweichung von der im Plan skizzierten
 * Alternative, ein Freitextfeld direkt auf `GameHolding` zu erlauben): der
 * Aufenthalt zeigt auf das dauerhafte Sammelkonto "Anonymer Meeple" (ein
 * echtes `Member`, siehe `prisma/seed.ts::ensureAnonymerMeeple`), der Name der
 * externen Person landet im ohnehin vorhandenen `note`-Feld. Das hält
 * `vereinsmitgliedId` als reine FK-Spalte (keine Freitext-Sonderfall-
 * Verzweigung an jeder Stelle, die sie liest — Ludothek-Browser, Admin-Bestand,
 * Bank-Export …) und macht "wie viele Spiele sind gerade extern" direkt
 * auswertbar (Filter auf das Sammelkonto statt auf ein zweites, nullable
 * Freitextfeld). Kein Ablehnen-Pfad: die empfangende Seite (das Sammelkonto)
 * wird nie gefragt, daher ist der neue Aufenthalt immer sofort bestätigt.
 */
export async function handOverToExternal({
  gameCopyId,
  externalName,
  anonymerMeepleVereinsmitgliedId,
  recordedByMeepleId,
}: {
  gameCopyId: string;
  externalName: string;
  anonymerMeepleVereinsmitgliedId: string;
  recordedByMeepleId: string;
}) {
  const trimmedName = externalName.trim();
  if (!trimmedName) {
    throw new HoldingConflictError("Bitte einen Namen angeben.");
  }

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
      target: { vereinsmitgliedId: anonymerMeepleVereinsmitgliedId },
      origin: HoldingOrigin.HANDOVER,
      recordedByMeepleId,
      confirmedAt: new Date(),
      note: `An extern weitergegeben: ${trimmedName}`,
    });
  });
}

/**
 * Spielewart-Umbuchen (#333): vom Sammelkonto "Anonymer Meeple" (oder einem
 * anderen Member ohne Portal-Konto) manuell auf ein echtes `Member` buchen,
 * sobald bekannt ist, wer das Spiel tatsächlich hat. Immer sofort bestätigt —
 * eine administrative Korrektur, kein Handshake mit der Zielperson.
 */
export async function rebookHoldingToMember({
  gameCopyId,
  toVereinsmitgliedId,
  recordedByMeepleId,
  note,
}: {
  gameCopyId: string;
  toVereinsmitgliedId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.vereinsmitgliedId) {
      throw new HoldingConflictError(
        "Umbuchen gilt nur für Aufenthalte, die gerade bei einer Person liegen.",
      );
    }

    return closeAndOpen(tx, {
      gameCopyId,
      previous,
      target: { vereinsmitgliedId: toVereinsmitgliedId },
      origin: HoldingOrigin.HANDOVER,
      recordedByMeepleId,
      confirmedAt: new Date(),
      note,
    });
  });
}

/**
 * "Ich habe das Spiel erhalten" für eine Rückgabe **von extern** (#333c/d) —
 * bewusst getrennt von `confirmHolding()` (`holdings.ts`), dessen Guard eine
 * Rückgabe generell nicht per Klick bestätigen lässt (Regelfall: Einlagern in
 * eine Einheit ist die Bestätigung, siehe CONTEXT.md "Rückgabe"). Diese
 * Ausnahme gilt nur, wenn die vorherige, gerade beendete Haltung "nicht
 * verfügbar" war (kein erreichbares Portal-Konto — Sammelkonto oder rein
 * extern geführtes Vereinsmitglied): dort gibt es niemanden, der stattdessen
 * einlagern könnte, also braucht die empfangende Seite einen expliziten,
 * einseitigen Bestätigungs-Klick.
 */
export async function confirmExternalReturn({
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
  if (holding.origin !== HoldingOrigin.RETURN) {
    throw new HoldingConflictError(
      "Nur eine Rückgabe kann so bestätigt werden.",
    );
  }
  if (holding.vereinsmitgliedId !== confirmingVereinsmitgliedId) {
    throw new HoldingConflictError(
      "Nur die empfangende Person kann diesen Aufenthalt bestätigen.",
    );
  }

  const previous = await prisma.gameHolding.findFirst({
    where: {
      gameCopyId: holding.gameCopyId,
      NOT: { id: holding.id },
      endedAt: holding.startedAt,
    },
    include: {
      vereinsmitglied: {
        include: { meeple: { select: { neonAuthUserId: true } } },
      },
    },
  });
  if (previous && isVerfuegbarerVereinsmitglied(previous.vereinsmitglied)) {
    throw new HoldingConflictError(
      "Eine Rückgabe von einem erreichbaren Vereinsmitglied wird nicht per Klick bestätigt, sondern durch Einlagern in eine Einheit.",
    );
  }

  if (holding.confirmedAt) {
    return holding;
  }

  return prisma.gameHolding.update({
    where: { id: holdingId },
    data: { confirmedAt: new Date() },
  });
}
