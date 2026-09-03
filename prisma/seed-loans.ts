import { HoldingOrigin } from "@prisma/client";
import { prisma } from "../src/lib/utils/prisma";
import { stableFloat, stableIndex } from "./seed-data/stable-random";

/** Markiert von diesem Seed-Schritt erzeugte Aufenthalte, damit der
 * Idempotenz-Check unten nicht auf reale, manuell in der (nicht leeren)
 * Dev-/Prod-DB angelegte Ausleihen anspringt — `origin: LOAN` allein ist
 * dafür nicht spezifisch genug. */
const DEMO_LOAN_NOTE = "Demo-Ausleihhistorie (Seed)";

const MAX_LOANS_PER_MEMBER = 4;
const MAX_DAYS_AGO = 365;
/** Mindestens so viele Tage vor "heute" muss eine Ausleihe zurückgegeben
 * worden sein — sonst wäre sie noch offen (kein Demo-Ziel hier, das deckt
 * bereits die reale Ludothek-Nutzung ab). */
const MIN_RETURN_DAYS_AGO = 10;
const MAX_LOAN_DURATION_DAYS = 28;
const MAX_SHELF_TIME_BEFORE_LOAN_DAYS = 90;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Vergibt an eine zufällige Teilmenge der Demo-Vereinsmitglieder je 0–4
 * (`MAX_LOANS_PER_MEMBER`) abgeschlossene Ausleihen aus dem letzten Jahr —
 * eine kleine, plausible Nutzungshistorie statt einer komplett unberührten
 * Ludothek, ohne dass der Großteil der Exemplare angefasst wird.
 *
 * Nur "jungfräuliche" `GameCopy`s (noch genau ein offener `INITIAL`-Aufenthalt
 * im Lager) werden angefasst — Idempotenz kommt aber aus dem Kurzschluss
 * oben: existiert bereits irgendeine `LOAN`-Ausleihe für eines der
 * übergebenen `memberIds`, war dieser Seed-Schritt schon gelaufen.
 */
export async function seedDemoLoanHistory(
  memberIds: string[],
  recordedByMeepleId: string,
) {
  const alreadySeeded = await prisma.gameHolding.count({
    where: { note: DEMO_LOAN_NOTE },
  });
  if (alreadySeeded > 0) {
    console.log("Demo-Ausleihhistorie bereits vorhanden, übersprungen.");
    return;
  }

  // "Jungfräulich" heißt: die gesamte Aufenthalts-Historie besteht aus genau
  // dem einen offenen `INITIAL`-Aufenthalt im Lager — nicht nur "aktuell ein
  // offener Aufenthalt" (der träfe nach dieser Funktion auf jedes Exemplar zu).
  const allCopies = await prisma.gameCopy.findMany({
    select: {
      id: true,
      holdings: { select: { id: true, unitId: true, endedAt: true } },
    },
  });
  const pool = allCopies.filter(
    (copy) =>
      copy.holdings.length === 1 &&
      copy.holdings[0].endedAt === null &&
      copy.holdings[0].unitId,
  );

  let poolIndex = 0;
  let loanCount = 0;

  for (const memberId of memberIds) {
    const loansForMember = stableIndex(
      `${memberId}:loan-count`,
      MAX_LOANS_PER_MEMBER + 1,
    );

    for (let i = 0; i < loansForMember; i += 1) {
      if (poolIndex >= pool.length) break;
      const copy = pool[poolIndex];
      poolIndex += 1;
      const initialHolding = copy.holdings[0];
      const loanKey = `${memberId}:loan:${i}`;

      const returnedDaysAgo = Math.round(
        MIN_RETURN_DAYS_AGO +
          stableFloat(`${loanKey}:return`) *
            (MAX_DAYS_AGO - MIN_RETURN_DAYS_AGO),
      );
      const loanDurationDays = Math.max(
        1,
        Math.round(stableFloat(`${loanKey}:duration`) * MAX_LOAN_DURATION_DAYS),
      );
      const shelfTimeDays = Math.round(
        stableFloat(`${loanKey}:shelf`) * MAX_SHELF_TIME_BEFORE_LOAN_DAYS,
      );

      const loanEnd = daysAgo(returnedDaysAgo);
      const loanStart = new Date(
        loanEnd.getTime() - loanDurationDays * 24 * 60 * 60 * 1000,
      );
      const shelvedAt = new Date(
        loanStart.getTime() - shelfTimeDays * 24 * 60 * 60 * 1000,
      );

      await prisma.$transaction([
        prisma.gameHolding.update({
          where: { id: initialHolding.id },
          data: { startedAt: shelvedAt, endedAt: loanStart },
        }),
        prisma.gameHolding.create({
          data: {
            gameCopyId: copy.id,
            vereinsmitgliedId: memberId,
            origin: HoldingOrigin.LOAN,
            startedAt: loanStart,
            endedAt: loanEnd,
            confirmedAt: loanStart,
            recordedByMeepleId,
            note: DEMO_LOAN_NOTE,
          },
        }),
        prisma.gameHolding.create({
          data: {
            gameCopyId: copy.id,
            unitId: initialHolding.unitId,
            origin: HoldingOrigin.RETURN,
            startedAt: loanEnd,
            endedAt: null,
            confirmedAt: loanEnd,
            recordedByMeepleId,
            note: DEMO_LOAN_NOTE,
          },
        }),
      ]);

      loanCount += 1;
    }
  }

  console.log(
    `${loanCount} Demo-Ausleihen über ${memberIds.length} Vereinsmitglieder verteilt (${pool.length - poolIndex} unberührte Exemplare übrig).`,
  );
}
