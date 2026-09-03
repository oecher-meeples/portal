import { prisma } from "@/lib/utils/prisma";

export type MemberWithoutLoginRow = {
  id: string;
  memberNumber: number;
  displayName: string;
  email: string;
};

/** Vereinsmitglieder ohne verknüpftes Meeple-Login und ohne Kündigung — die
 * Auswahl für "Einladung erstellen" (#329): eine Einladung ist immer an ein
 * bestehendes Mitglied gebunden, nie an eine frei eingegebene E-Mail-Adresse. */
export async function listMembersWithoutLogin(): Promise<
  MemberWithoutLoginRow[]
> {
  const [members, openInvites] = await Promise.all([
    prisma.member.findMany({
      // #374: ein Member ohne E-Mail (z. B. MiniMeeple, #373) kann ohnehin
      // nicht eingeladen werden — solche Zeilen tauchen in dieser Auswahl gar
      // nicht erst auf, statt später mit einem Fehler abzubrechen.
      where: { meepleId: null, resignedAt: null, email: { not: null } },
      orderBy: { memberNumber: "asc" },
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
    // #451: gleiche Bedingung wie findOpenInviteByEmail() — ein Mitglied mit
    // bereits offener Einladung darf nicht ein zweites Mal ausgewählt werden.
    prisma.invite.findMany({
      where: {
        redeemedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { email: true },
    }),
  ]);

  const invitedEmails = new Set(
    openInvites.map((invite) => invite.email.toLowerCase()),
  );

  return members
    .filter((member) => !invitedEmails.has(member.email!.toLowerCase()))
    .map((member) => ({
      id: member.id,
      memberNumber: member.memberNumber,
      displayName:
        [member.firstName, member.lastName].filter(Boolean).join(" ") ||
        member.email!,
      email: member.email!,
    }));
}
