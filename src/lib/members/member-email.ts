import { prisma, type DbClient } from "@/lib/utils/prisma";

/**
 * Eine E-Mail-Adresse pro Person (#614): die Vereinsmitglied-E-Mail
 * (`Member.email`) ist zugleich die Login-E-Mail (`AuthUser.email`) des
 * verknüpften Meeples. Jede wirksame Änderung — Vorstandsfreigabe eines
 * Änderungsantrags oder direkte Admin-Bearbeitung — ersetzt deshalb beide,
 * damit die alte Adresse nirgends hängen bleibt und für eine neue
 * Registrierung frei wird.
 */

async function loginUserIdOf(
  db: DbClient,
  memberId: string,
): Promise<string | null> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { meeple: { select: { neonAuthUserId: true } } },
  });
  return member?.meeple?.neonAuthUserId ?? null;
}

/** Fehlermeldung, wenn `email` schon einem anderen Vereinsmitglied oder einem
 * anderen Login gehört — `null`, wenn sie für dieses Mitglied frei ist. */
export async function findMemberEmailConflict(
  memberId: string,
  email: string,
): Promise<string | null> {
  const member = await prisma.member.findUnique({ where: { email } });
  if (member && member.id !== memberId) {
    return `Für ${email} existiert bereits ein anderes Vereinsmitglied.`;
  }
  const authUser = await prisma.authUser.findUnique({ where: { email } });
  if (authUser && authUser.id !== (await loginUserIdOf(prisma, memberId))) {
    return `${email} wird bereits für ein anderes Login verwendet.`;
  }
  return null;
}

/** Zieht die Login-E-Mail auf die (gerade gesetzte) `Member.email` nach,
 * wenn das Mitglied ein Login hat — im selben `db`/`tx` wie die
 * Member-Änderung aufrufen. Ohne Adresse (MiniMeeple, #373) bleibt das Login
 * unverändert: ein Login ohne E-Mail gibt es nicht. */
export async function syncLoginEmail(
  db: DbClient,
  memberId: string,
  email: string | null,
): Promise<void> {
  if (!email) return;
  const userId = await loginUserIdOf(db, memberId);
  if (userId) {
    await db.authUser.update({ where: { id: userId }, data: { email } });
  }
}
