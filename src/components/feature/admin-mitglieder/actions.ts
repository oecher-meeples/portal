"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createRole as createRoleRecord,
  updateRole as updateRoleRecord,
  deleteRole as deleteRoleRecord,
  setRolePermissions as setRolePermissionsRecord,
} from "@/lib/auth/roles";
import { anonymiseMeepleRecord } from "@/lib/members/anonymisation";
import { countOpenHoldings } from "@/lib/members/open-holdings";
import { setMemberNumber as setMemberNumberRecord } from "@/lib/members/member-number";
import { sendSelbstauskunftMail } from "@/lib/members/selbstauskunft-mail";
import {
  requireBankReader,
  revealMeepleIban,
} from "@/lib/members/bank-access-log";

async function requireMembersManage() {
  return requirePermission("members:manage");
}

/** How many games and units currently sit with this Meeple, for the confirmation dialog. */
export async function getOpenHoldingsSummary(meepleId: string) {
  await requireMembersManage();

  return countOpenHoldings(meepleId);
}

export async function recordResignation(meepleId: string, endsAt: Date) {
  await requireMembersManage();

  await prisma.$transaction([
    prisma.meeple.update({
      where: { id: meepleId },
      data: { resignedAt: new Date(), membershipEndsAt: endsAt },
    }),
    // No cron marks the exact turn-of-year moment, so this is the closest
    // practical hook to "wird ausgetreten" — close now rather than leave
    // open Gesuche nobody will ever close once access is revoked.
    prisma.lfgPost.updateMany({
      where: { createdByMeepleId: meepleId, closedAt: null },
      data: { closedAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function revokeResignation(meepleId: string) {
  await requireMembersManage();

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { resignedAt: null, membershipEndsAt: null },
  });

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function anonymiseMeeple(meepleId: string) {
  await requireMembersManage();

  const result = await anonymiseMeepleRecord(meepleId);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  revalidatePath("/markt");
  return { success: true as const };
}

export async function setMemberNumber(meepleId: string, newNumber: number) {
  await requireMembersManage();

  const result = await setMemberNumberRecord(meepleId, newNumber);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function renameMeeple(meepleId: string, displayName: string) {
  await requireMembersManage();

  const trimmed = displayName.trim();
  if (!trimmed) {
    return { error: "Bitte einen Anzeigenamen angeben." };
  }

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { displayName: trimmed },
  });

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/**
 * Reveals a Meeple's IBAN inside the Mitglieder-edit dialog. Gated on
 * `bank:read` specifically, not `members:manage` — an admin without the
 * Kassenwart-Recht only ever sees the masked value passed down from the page.
 */
export async function revealMemberIban(meepleId: string) {
  const actor = await requireBankReader();
  return revealMeepleIban(meepleId, actor.id);
}

/** Art. 15/20 self-disclosure, sent to the Meeple's stored email on an admin's request. */
export async function sendSelbstauskunft(meepleId: string) {
  await requireMembersManage();

  return sendSelbstauskunftMail(meepleId);
}

/**
 * A Meeple holds exactly one role at a time (see redeemInvite's DEFAULT_ROLE),
 * so changing it means swapping the UserRole row, not adding to a set.
 */
export async function setMeepleRole(meepleId: string, roleId: string) {
  await requireMembersManage();

  const [meeple, role] = await Promise.all([
    prisma.meeple.findUniqueOrThrow({ where: { id: meepleId } }),
    prisma.role.findUniqueOrThrow({ where: { id: roleId } }),
  ]);

  if (!meeple.neonAuthUserId) {
    return { error: "Dieses Mitglied hat kein Login-Konto." };
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: { neonAuthUserId: meeple.neonAuthUserId },
    }),
    prisma.userRole.create({
      data: { neonAuthUserId: meeple.neonAuthUserId, roleId: role.id },
    }),
  ]);

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function createRole(name: string, description: string | null) {
  await requireMembersManage();

  const result = await createRoleRecord(name, description);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function updateRole(
  roleId: string,
  name: string,
  description: string | null,
) {
  await requireMembersManage();

  const result = await updateRoleRecord(roleId, name, description);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function deleteRole(roleId: string) {
  await requireMembersManage();

  const result = await deleteRoleRecord(roleId);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
) {
  await requireMembersManage();

  const result = await setRolePermissionsRecord(roleId, permissionIds);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
