import type { MembershipState } from "@/lib/members/meeples";
import type { MeepleRoleAssignment } from "@/lib/auth/user-roles";

/**
 * One row of the Mitglieder table / edit dialog. Lives in its own file
 * (rather than inside mitglieder-table.tsx) so meeple-edit-dialog.tsx can
 * import the type without a circular import between the table and the dialog
 * it renders per row.
 */
export type MeepleRow = {
  id: string;
  memberNumber: number;
  displayName: string;
  /** `null` nur theoretisch (jeder reguläre Meeple hat laut #328 einen
   * verknüpften `Member`) — Link zur Vereinsmitglieder-Tabelle
   * (`/admin/mitglieder?memberId=…#vereinsmitglieder`), vice versa zum
   * "vorhanden"-Link dort. */
  memberId: string | null;
  /** Vorname/Nachname des verknüpften Vereinsmitglieds, `null` wenn (noch)
   * keins gepflegt ist — angezeigt neben `displayName` (dem frei wählbaren
   * Portal-Namen), der davon abweichen kann. */
  memberFullName: string | null;
  email: string | null;
  /** Alle Rollenzuweisungen (auch abgelaufene, siehe #264) — Mehrfachrollen (#335). */
  roleAssignments: MeepleRoleAssignment[];
  hasAccount: boolean;
  membershipState: MembershipState;
  joinedAt: string;
  resignedAt: string | null;
  membershipEndsAt: string | null;
  openGames: number;
  openUnits: number;
  accountHolder: string | null;
  maskedIban: string;
  hasIban: boolean;
  /** "System-Konto" (#297) — aus Mitgliederzählungen ausgenommen. */
  isSystemAccount: boolean;
};
