"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  computeExpiresAt,
  daysToMinutes,
  findOpenInviteByEmail,
  MAX_INVITE_DAYS,
} from "@/lib/members/invites";
import { prisma } from "@/lib/utils/prisma";

async function requireInvitesManage() {
  return requirePermission("invites:manage");
}

function assertValidDays(days: number) {
  if (!(days > 0) || days > MAX_INVITE_DAYS) {
    throw new Error(
      `Die Gültigkeitsdauer muss zwischen 0 und ${MAX_INVITE_DAYS} Tagen liegen.`,
    );
  }
}

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

/** Einladungen sind seit #329 immer an ein bestehendes `Member` gebunden —
 * `memberId` statt einer frei eingegebenen E-Mail-Adresse, damit die
 * Einladung nie an eine Adresse geht, die zu keinem Mitglied gehört. */
export async function createInvite({
  memberId,
  days,
}: {
  memberId: string;
  days: number;
}) {
  const admin = await requireInvitesManage();
  assertValidDays(days);
  const expiresIn = daysToMinutes(days);

  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
  });
  if (member.meepleId) {
    throw new Error("Dieses Mitglied hat bereits ein Portal-Login.");
  }
  const email = member.email;

  const existing = await findOpenInviteByEmail(email);
  if (existing) {
    const updated = await applyExpiresIn(existing.id, expiresIn);
    revalidatePath("/admin/mitglieder");
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

  revalidatePath("/admin/mitglieder");
  return {
    token: invite.token,
    email,
    expiresAt: invite.expiresAt.toISOString(),
    extended: false as const,
  };
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
