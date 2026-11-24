"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  requireActionPermission,
  type ActionActor,
} from "@/lib/auth/action-guards";
import {
  computeExpiresAt,
  daysToMinutes,
  findOpenInviteByEmail,
  inviteStatus,
} from "@/lib/members/invites";
import { getDefaultInviteDays } from "@/lib/members/invite-settings";
import { sendInviteMail } from "@/lib/members/invite-mail";
import { listMissingInviteCandidates } from "@/lib/members/members-without-login";
import { prisma } from "@/lib/utils/prisma";

type InvitesManageAdmin = ActionActor["user"];

/** Shared by the duplicate-email path in `createInvite` and the
 * "Verlängern"-Button — recomputes `expiresAt` from now, not from the old one. */
async function applyExpiresIn(id: string, expiresIn?: number) {
  const invite = await prisma.invite.findUniqueOrThrow({ where: { id } });
  const minutes = expiresIn ?? invite.expiresIn;
  return prisma.invite.update({
    where: { id },
    data: { expiresIn: minutes, expiresAt: computeExpiresAt(minutes) },
  });
}

/** Core of `createInvite`, factored out so the CSV-Bulk-Import
 * (`bulkImportInvites`, #265) can create one bound invite per matched
 * member without duplicating the expiry/dedup logic. Caller has already
 * checked the permission and resolved `member`. Mails the registration link
 * (#613) — `mailError` instead of a throw, the invite stays valid either way. */
async function createInviteForMember(
  admin: InvitesManageAdmin,
  member: { meepleId: string | null; email: string | null },
  expiresIn: number,
) {
  if (member.meepleId) {
    throw new Error("Dieses Mitglied hat bereits ein Portal-Login.");
  }
  if (!member.email) {
    throw new Error("Dieses Mitglied hat keine E-Mail-Adresse hinterlegt.");
  }
  const email = member.email;

  const existing = await findOpenInviteByEmail(email);
  if (existing) {
    const updated = await applyExpiresIn(existing.id, expiresIn);
    return {
      token: updated.token,
      email,
      expiresAt: updated.expiresAt.toISOString(),
      extended: true as const,
      mailError: await sendInviteMail(updated),
    };
  }

  const invite = await prisma.invite.create({
    data: {
      token: randomBytes(24).toString("hex"),
      createdByUserId: admin.id,
      email,
      expiresIn,
      expiresAt: computeExpiresAt(expiresIn),
    },
  });

  return {
    token: invite.token,
    email,
    expiresAt: invite.expiresAt.toISOString(),
    extended: false as const,
    mailError: await sendInviteMail(invite),
  };
}

/** Einladungen sind seit #329 immer an ein bestehendes `Member` gebunden —
 * `memberId` statt einer frei eingegebenen E-Mail-Adresse, damit die
 * Einladung nie an eine Adresse geht, die zu keinem Mitglied gehört.
 *
 * Die Gültigkeitsdauer ist seit #349 nicht mehr pro Einladung wählbar —
 * `createInvite` liest sie selbst aus `/admin/einstellungen/einladungen`
 * (`getDefaultInviteDays()`), ein Aufrufer kann sie nicht überschreiben. */
export async function createInvite({ memberId }: { memberId: string }) {
  const { user: admin } = await requireActionPermission("invites:manage");
  const days = await getDefaultInviteDays();
  const expiresIn = daysToMinutes(days);

  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
  });

  const result = await createInviteForMember(admin, member, expiresIn);
  revalidatePath("/admin/mitglieder");
  return result;
}

export type BulkInviteResult = {
  created: number;
  errors: { email: string; message: string }[];
};

type InvitableMember = { meepleId: string | null; email: string | null };

/** Versandschleife für mehrere Einladungen — geteilt von der CSV-Bulk-
 * Einladung (#265) und „Alle Fehlenden einladen" (#622). Ein Eintrag ohne
 * `member` ist ein Zeilenfehler statt eines Abbruchs, ebenso eine
 * fehlgeschlagene Mail. */
async function inviteMembers(
  admin: InvitesManageAdmin,
  entries: { email: string; member: InvitableMember | null }[],
): Promise<BulkInviteResult> {
  const days = await getDefaultInviteDays();
  const expiresIn = daysToMinutes(days);

  const errors: { email: string; message: string }[] = [];
  let created = 0;

  for (const { email, member } of entries) {
    if (!member) {
      errors.push({
        email,
        message: "Kein einladbares Mitglied mit dieser E-Mail-Adresse.",
      });
      continue;
    }

    try {
      const { mailError } = await createInviteForMember(
        admin,
        member,
        expiresIn,
      );
      created += 1;
      if (mailError) {
        errors.push({
          email,
          message: `Einladung angelegt, Mail fehlgeschlagen: ${mailError}`,
        });
      }
    } catch (error) {
      errors.push({
        email,
        message:
          error instanceof Error
            ? error.message
            : "Einladung konnte nicht erzeugt werden.",
      });
    }
  }

  revalidatePath("/admin/mitglieder");
  return { created, errors };
}

/** CSV-Bulk-Einladung (#265) — pro E-Mail wird das zugehörige, noch nicht
 * eingeloggte `Member` gesucht (gleiche Auswahl wie `InviteForm`s
 * Mitglieder-ohne-Login-Liste) und darüber eine gebundene Einladung
 * angelegt. Eine E-Mail ohne passendes Mitglied ist ein Zeilenfehler statt
 * eines Abbruchs — analog `importFleaMarketItemsCsv`. */
export async function bulkImportInvites(
  emails: string[],
): Promise<BulkInviteResult> {
  const { user: admin } = await requireActionPermission("invites:manage");

  const entries = [];
  for (const email of emails) {
    const member = await prisma.member.findFirst({
      where: { email, meepleId: null, resignedAt: null },
    });
    entries.push({ email, member });
  }
  return inviteMembers(admin, entries);
}

/** Anzahl für den Bestätigungsdialog von „Alle Fehlenden einladen" (#622). */
export async function countMissingInvites() {
  await requireActionPermission("invites:manage");

  return { count: (await listMissingInviteCandidates()).length };
}

/** „Alle Fehlenden einladen" (#622): Kandidaten werden serverseitig neu
 * bestimmt, nicht vom Client übernommen — ein zweiter Klick findet die eben
 * Eingeladenen deshalb nicht mehr (offene Einladung). */
export async function inviteAllMissing(): Promise<BulkInviteResult> {
  const { user: admin } = await requireActionPermission("invites:manage");

  const candidates = await listMissingInviteCandidates();
  return inviteMembers(
    admin,
    candidates.map((member) => ({ email: member.email, member })),
  );
}

/** Reapplies the invite's own stored `expiresIn` from now — no new input
 * needed — and mails the link again with the new expiry (#613). */
export async function extendInvite(id: string) {
  await requireActionPermission("invites:manage");
  const invite = await applyExpiresIn(id);
  revalidatePath("/admin/mitglieder");
  const mailError = await sendInviteMail(invite);
  if (mailError) {
    return { error: `Verlängert, Mail fehlgeschlagen: ${mailError}` };
  }
  return { success: true as const };
}

/** "Erneut per Mail senden" (#613) — only for a still-open invite. */
export async function resendInviteMail(id: string) {
  await requireActionPermission("invites:manage");
  const invite = await prisma.invite.findUniqueOrThrow({ where: { id } });
  if (inviteStatus(invite) !== "offen") {
    return { error: "Diese Einladung ist nicht mehr offen." };
  }
  const mailError = await sendInviteMail(invite);
  return mailError ? { error: mailError } : { success: true as const };
}

/** Invalidates a still-open invite link without deleting its record — the
 * audit trail (who created it, when) stays visible in the list. */
export async function revokeInvite(id: string) {
  await requireActionPermission("invites:manage");

  await prisma.invite.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
