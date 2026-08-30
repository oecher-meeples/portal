import type { MembershipState } from "@/lib/members/meeples";
import type { ContributionCategory } from "@/lib/members/contribution";

/** Eine Zeile der Vereinsmitglieder-Tabelle (#334, Paket 6) — Member-zentrisch,
 * im Gegensatz zur Meeple-zentrischen `MeepleRow` (`meeple-row.ts`). Ein
 * Vereinsmitglied kann ohne `Meeple` existieren (noch kein Login, #328). */
export type VereinsmitgliedRow = {
  id: string;
  memberNumber: number;
  displayName: string;
  email: string;
  meepleId: string | null;
  /** `Meeple.joinedAt` des verknüpften Portal-Kontos — `null` ohne Login. */
  joinedAt: string | null;
  resignedAt: string | null;
  membershipEndsAt: string | null;
  membershipState: MembershipState;
  contributionCategory: ContributionCategory | null;
  openGames: number;
  openUnits: number;
  /** Stufe 3 (endgültige Löschung) ist fällig — siehe `listMembersEligibleForStufe3`. */
  stufe3Eligible: boolean;
};
