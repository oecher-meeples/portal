import {
  ProfilePictureVisibility,
  type RuleBookLanguage,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { formatLocationChain } from "@/lib/ludothek/holdings-lookup";
import { memberDisplayName } from "@/lib/members/member-display-name";

/**
 * One physical copy currently at a Vereinsmitglied, for
 * `getActiveHoldingsByMeeple()`. Carries the fields `GameActionsMenu` needs
 * (#272-Folge) — zustand is always "ausgeliehen-*" here (a person-Holding by
 * definition), so unlike `admin-bestand-rows.ts` there is no unit chain to walk.
 */
export type ActiveMeepleHolding = {
  gameCopyId: string;
  boardGameId: string;
  boardGameTitle: string;
  /** Für den Link zur Spieledetailseite (`/ludothek/[slug]`, #457). */
  boardGameSlug: string;
  startedAt: Date;
  locationChain: string;
  condition: string | null;
  ruleBookLanguages: RuleBookLanguage[];
  inventoryNumber: string | null;
  /** Offene Weitergabe/Ausleihe, die die empfangende Person noch nicht
   * bestätigt hat (#406). */
  isUnconfirmed: boolean;
};

/** All active holdings for one Vereinsmitglied, for the accordion in #272's
 * overview page. `verfuegbar` (#333) tells whether the Member has a reachable
 * Portal-Konto; Adresse/Telefon are always carried here — the caller decides
 * whether to render them, gated behind `games:manage`. */
export type MeepleWithActiveHoldings = {
  vereinsmitgliedId: string;
  memberName: string;
  /** `null` ohne verknüpftes Meeple-Konto (z. B. MiniMeeple) — `ContactDialog`
   * bekommt dann keinen `meepleId`-Trigger, der Name bleibt reiner Text. */
  meepleId: string | null;
  /** Für das Hover-Popup mit Bild auf den Namen (#412-Folgefeedback) —
   * `null`, wenn kein Meeple-Konto verknüpft ist (dann bleibt es beim
   * Initialen-Fallback). */
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
  verfuegbar: boolean;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  holdings: ActiveMeepleHolding[];
};

/**
 * Every currently open person-`GameHolding`, grouped by Vereinsmitglied
 * (#272, #333) — "wo befinden sich Spiele gerade physisch", not the narrower
 * Ausleihe-Definition from CONTEXT.md. Deliberate deviation from
 * `isLoanHolding()`: a Member who is merely receiving a RETURN for storage
 * (not borrowing) still shows up here, since the game is physically with them
 * either way.
 */
export async function getActiveHoldingsByMeeple(): Promise<
  MeepleWithActiveHoldings[]
> {
  const holdings = await prisma.gameHolding.findMany({
    where: { vereinsmitgliedId: { not: null }, endedAt: null },
    orderBy: { startedAt: "asc" },
    select: {
      gameCopyId: true,
      startedAt: true,
      confirmedAt: true,
      vereinsmitglied: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          street: true,
          postalCode: true,
          city: true,
          phone: true,
          meeple: {
            select: {
              id: true,
              displayName: true,
              neonAuthUserId: true,
              profilePictureUrl: true,
              profilePictureVisibility: true,
            },
          },
        },
      },
      gameCopy: {
        select: {
          condition: true,
          ruleBookLanguages: true,
          inventoryNumber: true,
          boardGame: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });

  const byMember = new Map<string, MeepleWithActiveHoldings>();
  for (const holding of holdings) {
    const member = holding.vereinsmitglied;
    if (!member) continue;

    const name = memberDisplayName(member);
    const entry = byMember.get(member.id) ?? {
      vereinsmitgliedId: member.id,
      memberName: name,
      meepleId: member.meeple?.id ?? null,
      profilePictureUrl: member.meeple?.profilePictureUrl ?? null,
      profilePictureVisibility:
        member.meeple?.profilePictureVisibility ??
        ProfilePictureVisibility.INTERN,
      verfuegbar: Boolean(member.meeple?.neonAuthUserId),
      street: member.street,
      postalCode: member.postalCode,
      city: member.city,
      phone: member.phone,
      holdings: [],
    };
    entry.holdings.push({
      gameCopyId: holding.gameCopyId,
      boardGameId: holding.gameCopy.boardGame.id,
      boardGameTitle: holding.gameCopy.boardGame.title,
      boardGameSlug: holding.gameCopy.boardGame.slug,
      startedAt: holding.startedAt,
      locationChain: formatLocationChain({
        responsibleName: name,
        unitChain: "",
      }),
      condition: holding.gameCopy.condition,
      ruleBookLanguages: holding.gameCopy.ruleBookLanguages,
      inventoryNumber: holding.gameCopy.inventoryNumber,
      isUnconfirmed: !holding.confirmedAt,
    });
    byMember.set(member.id, entry);
  }

  return [...byMember.values()].sort((a, b) =>
    a.memberName.localeCompare(b.memberName, "de"),
  );
}

/** Total count of currently active person-`GameHolding`s, für die Ausleihen-Karte
 * auf `admin/bestand` (#272-Folge) — same scope as {@link getActiveHoldingsByMeeple}. */
export async function countActiveMeepleHoldings(): Promise<number> {
  return prisma.gameHolding.count({
    where: { vereinsmitgliedId: { not: null }, endedAt: null },
  });
}

/** Aktive Ausleihen genau eines Vereinsmitglieds, für den
 * Vereinsspiele-Bereich der Profilseite (#383) — dieselbe Zeilenform wie
 * {@link getActiveHoldingsByMeeple}, nur schon auf ein Mitglied gefiltert. */
export async function getActiveHoldingsForMember(
  memberId: string,
): Promise<ActiveMeepleHolding[]> {
  const holdings = await prisma.gameHolding.findMany({
    where: { vereinsmitgliedId: memberId, endedAt: null },
    orderBy: { startedAt: "asc" },
    select: {
      gameCopyId: true,
      startedAt: true,
      confirmedAt: true,
      gameCopy: {
        select: {
          condition: true,
          ruleBookLanguages: true,
          inventoryNumber: true,
          boardGame: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });

  return holdings.map((holding) => ({
    gameCopyId: holding.gameCopyId,
    boardGameId: holding.gameCopy.boardGame.id,
    boardGameTitle: holding.gameCopy.boardGame.title,
    boardGameSlug: holding.gameCopy.boardGame.slug,
    startedAt: holding.startedAt,
    locationChain: "",
    condition: holding.gameCopy.condition,
    ruleBookLanguages: holding.gameCopy.ruleBookLanguages,
    inventoryNumber: holding.gameCopy.inventoryNumber,
    isUnconfirmed: !holding.confirmedAt,
  }));
}
