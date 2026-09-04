import {
  PrivateEventLoanStatus,
  type ProfilePictureVisibility,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

/**
 * Ausleihe eines privat mitgebrachten Spiels am Event (#122) — bewusst kein
 * `GameCopy`-Klon: kein Standort, keine `GameHolding`-Kette, keine
 * Zustandsverwaltung. Nur drei Zustände: angeboten, ausgeliehen,
 * zurückgegeben. Haftungsfragen sind bewusst außerhalb dieses Modells, siehe
 * #277.
 */

export type OwnPrivateLoanOffer = {
  id: string;
  boardGameId: string;
  /** Nie "RETURNED" — die Query unten filtert das bereits aus. */
  status: Exclude<PrivateEventLoanStatus, "RETURNED">;
};

/** Eigene Freigaben eines Meeples für ein Event — Grundlage für die
 * Freigabe-Toggles in `PrivateCollectionCard`. */
export async function listOwnPrivateLoanOffers(
  ownerMeepleId: string,
  eventId: string,
): Promise<OwnPrivateLoanOffer[]> {
  const loans = await prisma.privateEventLoan.findMany({
    where: { ownerMeepleId, eventId, status: { not: "RETURNED" } },
    select: { id: true, boardGameId: true, status: true },
  });
  // Die Query oben schließt "RETURNED" bereits aus — Prisma kann das im
  // Rückgabetyp aber nicht selbst ausdrücken.
  return loans as OwnPrivateLoanOffer[];
}

/**
 * Eigentümer:in gibt ein Spiel aus der eigenen `PrivateGameCollectionEntry`
 * für ein Event zur Ausleihe frei — explizite Zustimmung pro Titel, die
 * Event-Anmeldung (z. B. als Erklärbär) allein reicht laut Issue-Klärung
 * nicht. Idempotent: ein bereits angebotenes/ausgeliehenes Exemplar bleibt
 * unverändert, ein zuvor zurückgegebenes wird erneut angeboten.
 */
export async function offerPrivateGameForEvent(
  ownerMeepleId: string,
  eventId: string,
  boardGameId: string,
): Promise<{ error: string } | { success: true }> {
  const owns = await prisma.privateGameCollectionEntry.findUnique({
    where: { meepleId_boardGameId: { meepleId: ownerMeepleId, boardGameId } },
    select: { id: true },
  });
  if (!owns) {
    return {
      error: "Dieser Titel ist nicht in deiner privaten Collection.",
    };
  }

  const existing = await prisma.privateEventLoan.findUnique({
    where: {
      eventId_ownerMeepleId_boardGameId: {
        eventId,
        ownerMeepleId,
        boardGameId,
      },
    },
    select: { status: true },
  });

  if (!existing) {
    await prisma.privateEventLoan.create({
      data: { eventId, ownerMeepleId, boardGameId },
    });
    return { success: true };
  }

  if (existing.status === "RETURNED") {
    await prisma.privateEventLoan.update({
      where: {
        eventId_ownerMeepleId_boardGameId: {
          eventId,
          ownerMeepleId,
          boardGameId,
        },
      },
      data: {
        status: "OFFERED",
        issuedAt: null,
        issuedByMeepleId: null,
        returnedAt: null,
      },
    });
  }

  return { success: true };
}

/** Zurückziehen einer Freigabe, solange sie noch nicht ausgegeben wurde —
 * einmal ausgeliehen kann die Eigentümer:in die Freigabe nicht mehr per
 * Selbstbedienung entziehen, das läuft über die Rückgabe. */
export async function withdrawPrivateGameOffer(
  ownerMeepleId: string,
  eventId: string,
  boardGameId: string,
): Promise<{ error: string } | { success: true }> {
  const result = await prisma.privateEventLoan.deleteMany({
    where: { ownerMeepleId, eventId, boardGameId, status: "OFFERED" },
  });
  if (result.count === 0) {
    return {
      error:
        "Freigabe kann nicht zurückgezogen werden — das Exemplar ist bereits ausgeliehen oder nicht (mehr) freigegeben.",
    };
  }
  return { success: true };
}

export type OfferedPrivateLoan = {
  id: string;
  status: PrivateEventLoanStatus;
  boardGame: { id: string; title: string; slug: string };
  owner: {
    id: string;
    displayName: string;
    profilePictureUrl: string | null;
    profilePictureVisibility: ProfilePictureVisibility;
  };
};

/** Für die Ausleihe-Meeple-Ansicht (`/ausleihe`, #121-Zugriffsschutz):
 * angebotene und bereits ausgegebene private Exemplare eines Events — nicht
 * zurückgegebene fallen aus der Liste, sobald abgeschlossen. */
export function listOfferedPrivateLoansForEvent(
  eventId: string,
): Promise<OfferedPrivateLoan[]> {
  return prisma.privateEventLoan.findMany({
    where: { eventId, status: { not: "RETURNED" } },
    orderBy: { offeredAt: "asc" },
    select: {
      id: true,
      status: true,
      boardGame: { select: { id: true, title: true, slug: true } },
      owner: {
        select: {
          id: true,
          displayName: true,
          profilePictureUrl: true,
          profilePictureVisibility: true,
        },
      },
    },
  });
}

/** Ausgabe an einen Event-Gast — analog `ausleiheIssueGame` für
 * Vereinsbestand, aber ohne Standort-/Einheiten-Buchung. */
export async function issuePrivateLoan(
  loanId: string,
  issuedByMeepleId: string,
): Promise<{ error: string } | { success: true }> {
  const result = await prisma.privateEventLoan.updateMany({
    where: { id: loanId, status: "OFFERED" },
    data: {
      status: PrivateEventLoanStatus.LOANED,
      issuedAt: new Date(),
      issuedByMeepleId,
    },
  });
  if (result.count === 0) {
    return {
      error: "Dieses Exemplar ist nicht (mehr) zur Ausgabe angeboten.",
    };
  }
  return { success: true };
}

/** Rückgabe an die Eigentümer:in nach Event-Ende — Abschlusszustand, der
 * Datensatz kann danach gelöscht werden (#122), wird hier aber bewusst nicht
 * automatisch gelöscht: die Ausleihe-Meeple-Ansicht blendet zurückgegebene
 * Exemplare einfach aus (siehe `listOfferedPrivateLoansForEvent`). */
export async function returnPrivateLoan(
  loanId: string,
): Promise<{ error: string } | { success: true }> {
  const result = await prisma.privateEventLoan.updateMany({
    where: { id: loanId, status: "LOANED" },
    data: { status: PrivateEventLoanStatus.RETURNED, returnedAt: new Date() },
  });
  if (result.count === 0) {
    return { error: "Dieses Exemplar ist nicht (mehr) ausgeliehen." };
  }
  return { success: true };
}
