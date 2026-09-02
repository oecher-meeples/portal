"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  computeExpiresAt,
  daysToMinutes,
  findOpenInviteByEmail,
} from "@/lib/members/invites";
import { getDefaultInviteDays } from "@/lib/members/invite-settings";
import { prisma } from "@/lib/utils/prisma";

async function requireInvitesManage() {
  return requirePermission("invites:manage");
}

type InvitesManageAdmin = Awaited<ReturnType<typeof requireInvitesManage>>;

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
 * checked the permission and resolved `member`. */
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
  const admin = await requireInvitesManage();
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

/** CSV-Bulk-Einladung (#265) — pro E-Mail wird das zugehörige, noch nicht
 * eingeloggte `Member` gesucht (gleiche Auswahl wie `InviteForm`s
 * Mitglieder-ohne-Login-Liste) und darüber eine gebundene Einladung
 * angelegt. Eine E-Mail ohne passendes Mitglied ist ein Zeilenfehler statt
 * eines Abbruchs — analog `importFleaMarketItemsCsv`. */
export async function bulkImportInvites(
  emails: string[],
): Promise<BulkInviteResult> {
  const admin = await requireInvitesManage();
  const days = await getDefaultInviteDays();
  const expiresIn = daysToMinutes(days);

  const errors: { email: string; message: string }[] = [];
  let created = 0;

  for (const email of emails) {
    const member = await prisma.member.findFirst({
      where: { email, meepleId: null, resignedAt: null },
    });
    if (!member) {
      errors.push({
        email,
        message: "Kein einladbares Mitglied mit dieser E-Mail-Adresse.",
      });
      continue;
    }

    try {
      await createInviteForMember(admin, member, expiresIn);
      created += 1;
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

/** Reapplies the invite's own stored `expiresIn` from now — no new input needed. */
export async function extendInvite(id: string) {
  await requireInvitesManage();
  await applyExpiresIn(id);
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/** Invalidates a still-open invite link without deleting its record — the
 * audit trail (who created it, when) stays visible in the list. */
export async function revokeInvite(id: string) {
  await requireInvitesManage();

  await prisma.invite.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
