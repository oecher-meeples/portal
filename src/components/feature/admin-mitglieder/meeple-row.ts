import type { MembershipState } from "@/lib/members/meeples";

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
  email: string | null;
  roleId: string | null;
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
};
