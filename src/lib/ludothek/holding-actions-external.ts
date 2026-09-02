"use server";

import { prisma } from "@/lib/utils/prisma";
import { ensureMeeple } from "@/lib/members/meeples";
import { memberDisplayName } from "@/lib/members/member-display-name";
import { borrowGame, HoldingConflictError } from "@/lib/ludothek/holdings";
import {
  confirmExternalReturn,
  handOverToExternal,
  rebookHoldingToMember,
} from "@/lib/ludothek/holdings-external";
import {
  ANONYMER_MEEPLE_NAME,
  findAnonymerMeepleMember,
} from "@/lib/ludothek/anonymer-meeple";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { getMembershipState } from "@/lib/members/membership-state";
import {
  requireActingMeeple,
  requireOwnMember,
  assertCanReceive,
  toResultAndRevalidate,
} from "@/lib/ludothek/holding-actions-shared";

/**
 * "An extern weitergegeben" (#333b): Freitext-Name statt Meeple-Auswahl, kein
 * Ablehnen-Pfad — schließt den eigenen Aufenthalt und öffnet einen neuen auf
 * dem Sammelkonto "Anonymer Meeple". Jedes Meeple darf das für sein eigenes
 * Exemplar (self-service), keine `games:manage`-Beschränkung.
 */
export async function scanHandOverToExternal(
  gameCopyId: string,
  externalName: string,
) {
  const { meeple } = await requireActingMeeple();

  return toResultAndRevalidate(async () => {
    const anonymerMeeple = await findAnonymerMeepleMember();
    if (!anonymerMeeple) {
      throw new HoldingConflictError(
        `Sammelkonto "${ANONYMER_MEEPLE_NAME}" fehlt — bitte den Seed erneut ausführen.`,
      );
    }
    return handOverToExternal({
      gameCopyId,
      externalName,
      anonymerMeepleVereinsmitgliedId: anonymerMeeple.id,
      recordedByMeepleId: meeple.id,
    });
  });
}

/**
 * "An extern ausgeben" (#333a, `games:manage`): Ausleihe an ein
 * Vereinsmitglied, das (noch) kein Portal-Konto hat — Ziel kommt aus der
 * `Member`-Tabelle, nicht aus dem Meeple-Picker.
 */
export async function scanLendToExternalMember(
  gameCopyId: string,
  toMemberId: string,
) {
  const user = await requireGamesManagePermission();
  if (!user) return { error: "Keine Berechtigung." };
  const actor = await ensureMeeple(user);

  return toResultAndRevalidate(() =>
    borrowGame({
      gameCopyId,
      vereinsmitgliedId: toMemberId,
      recordedByMeepleId: actor.id,
      isSelf: false,
    }),
  );
}

/**
 * Spielewart-Umbuchen (#333, `games:manage`): vom Sammelkonto/einer externen
 * Person manuell auf ein echtes `Member` buchen.
 */
export async function scanRebookToMember(
  gameCopyId: string,
  toMemberId: string,
) {
  const user = await requireGamesManagePermission();
  if (!user) return { error: "Keine Berechtigung." };
  const actor = await ensureMeeple(user);

  return toResultAndRevalidate(() =>
    rebookHoldingToMember({
      gameCopyId,
      toVereinsmitgliedId: toMemberId,
      recordedByMeepleId: actor.id,
    }),
  );
}

/** "Ich habe das Spiel erhalten" für eine Rückgabe von extern (#333c/d). */
export async function scanConfirmExternalReturn(holdingId: string) {
  const { member, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    const own = requireOwnMember(member);
    return confirmExternalReturn({
      holdingId,
      confirmingVereinsmitgliedId: own.id,
    });
  });
}

export type MemberOption = { id: string; displayName: string };

/**
 * Vereinsmitglied-Picker für "An extern ausgeben"/Umbuchen (#333a, Umbuchen),
 * `games:manage`-only. Zeigt jedes `Member` — mit und ohne eigenes Meeple-
 * Konto — und markiert das Sammelkonto "Anonymer Meeple" mit einem Suffix,
 * statt es auszublenden: für Umbuchen ist es gerade das erwartete Ziel/Quelle.
 * Bewusst keine Nummerierung ("Anonymer Meeple #4") wie im Plan-Wortlaut
 * angedeutet — es gibt genau ein dauerhaftes Sammelkonto, kein Kontingent.
 * Ein "ausgetretenes" Mitglied wird ausgeblendet (#405) — es könnte eine so
 * angelegte Ausleihe ohnehin nie selbst bestätigen; das Sammelkonto bleibt
 * davon unberührt, es tritt nie aus.
 */
export async function scanListMembers(): Promise<MemberOption[]> {
  const user = await requireGamesManagePermission();
  if (!user) return [];

  const members = await prisma.member.findMany({
    where: { OR: [{ meepleId: null }, { meeple: { anonymizedAt: null } }] },
    orderBy: { memberNumber: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      meepleId: true,
      resignedAt: true,
      membershipEndsAt: true,
      meeple: { select: { displayName: true, anonymizedAt: true } },
    },
  });

  return members
    .filter(
      (member) =>
        member.meeple?.displayName === ANONYMER_MEEPLE_NAME ||
        getMembershipState({
          ...member,
          anonymizedAt: member.meeple?.anonymizedAt ?? null,
        }) !== "ausgetreten",
    )
    .map((member) => ({
      id: member.id,
      displayName:
        member.meeple?.displayName === ANONYMER_MEEPLE_NAME
          ? `${ANONYMER_MEEPLE_NAME} (Sammelkonto)`
          : memberDisplayName(member),
    }));
}
