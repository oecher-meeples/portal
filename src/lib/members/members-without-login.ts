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
  const members = await prisma.member.findMany({
    where: { meepleId: null, resignedAt: null },
    orderBy: { memberNumber: "asc" },
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return members.map((member) => ({
    id: member.id,
    memberNumber: member.memberNumber,
    displayName:
      [member.firstName, member.lastName].filter(Boolean).join(" ") ||
      member.email,
    email: member.email,
  }));
}
