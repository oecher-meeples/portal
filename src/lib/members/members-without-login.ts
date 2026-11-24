import { prisma } from "@/lib/utils/prisma";
import { memberFullName } from "@/lib/members/member-display-name";
import { inviteStatus } from "@/lib/members/invite-format";

export type MemberWithoutLoginRow = {
  id: string;
  memberNumber: number;
  displayName: string;
  email: string;
};

/** Mitglieder mit E-Mail, ohne Login und ohne Kündigung — die Grundmenge
 * jeder Einladungsauswahl. */
function findInvitableMembers() {
  return prisma.member.findMany({
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
  });
}

/** Vereinsmitglieder ohne verknüpftes Meeple-Login und ohne Kündigung — die
 * Auswahl für "Einladung erstellen" (#329): eine Einladung ist immer an ein
 * bestehendes Mitglied gebunden, nie an eine frei eingegebene E-Mail-Adresse. */
export async function listMembersWithoutLogin(): Promise<
  MemberWithoutLoginRow[]
> {
  const [members, openInvites] = await Promise.all([
    findInvitableMembers(),
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
      displayName: memberFullName(member) || member.email!,
      email: member.email!,
    }));
}

/** Kandidaten für „Alle Fehlenden einladen" (#622): einladbare Mitglieder,
 * deren **jüngste** Einladung fehlt oder abgelaufen ist. Eine offene
 * Einladung wird nicht verdoppelt (Erinnern geht über „Erneut senden"), eine
 * widerrufene war eine bewusste Admin-Entscheidung und wird nicht
 * stillschweigend aufgehoben — auch dann nicht, wenn davor eine ältere
 * abgelaufen ist. */
export async function listMissingInviteCandidates(
  now: Date = new Date(),
): Promise<{ id: string; email: string; meepleId: null }[]> {
  const members = await findInvitableMembers();
  const emails = members.map((member) => member.email!.toLowerCase());
  const invites = emails.length
    ? await prisma.invite.findMany({
        where: { email: { in: emails } },
        orderBy: { createdAt: "desc" },
        select: {
          email: true,
          redeemedAt: true,
          revokedAt: true,
          expiresAt: true,
        },
      })
    : [];

  const latestByEmail = new Map<string, (typeof invites)[number]>();
  for (const invite of invites) {
    if (!latestByEmail.has(invite.email)) {
      latestByEmail.set(invite.email, invite);
    }
  }

  return members
    .filter((member) => {
      const latest = latestByEmail.get(member.email!.toLowerCase());
      return !latest || inviteStatus(latest, now) === "abgelaufen";
    })
    .map((member) => ({ id: member.id, email: member.email!, meepleId: null }));
}
