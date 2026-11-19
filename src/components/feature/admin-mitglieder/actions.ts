"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import {
  createRole as createRoleRecord,
  updateRole as updateRoleRecord,
  deleteRole as deleteRoleRecord,
  setRolePermissions as setRolePermissionsRecord,
  reorderRoles as reorderRolesRecord,
} from "@/lib/auth/roles";
import {
  assignMeepleRole as assignMeepleRoleRecord,
  removeMeepleRole as removeMeepleRoleRecord,
  listMeepleRoleAssignments,
} from "@/lib/auth/user-roles";
import {
  anonymiseMeepleStufe1,
  anonymiseMeepleStufe2,
  anonymiseMemberStufe3,
} from "@/lib/members/anonymisation";
import { removeAusgetretenRole } from "@/lib/auth/ausgetreten-role";
import { countOpenHoldings } from "@/lib/members/open-holdings";
import { setMemberNumber as setMemberNumberRecord } from "@/lib/members/member-number";

/** How many games and units currently sit with this Meeple, for the confirmation dialog. */
export async function getOpenHoldingsSummary(meepleId: string) {
  await requireActionPermission("members:manage");

  return countOpenHoldings(meepleId);
}

/** `meepleId` weiterhin, weil die Admin-UI Meeples auflistet — die Kündigung
 * selbst wird seit #328 auf der verknüpften `Member`-Zeile vermerkt. */
export async function recordResignation(meepleId: string, endsAt: Date) {
  await requireActionPermission("members:manage");

  await prisma.$transaction([
    prisma.member.update({
      where: { meepleId },
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
  await requireActionPermission("members:manage");

  await prisma.member.update({
    where: { meepleId },
    data: { resignedAt: null, membershipEndsAt: null },
  });
  // Falls der Jahreswechsel-Cron zwischenzeitlich schon die "Ausgetreten"-Rolle
  // gesetzt hatte (#332) — sonst bliebe die Einschränkung trotz Widerruf bestehen.
  await removeAusgetretenRole(meepleId);

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/** Stufe 1 + Stufe 2 zusammen — der bisherige Ein-Klick-Admin-Flow (#331).
 * Stufe 3 (Member-Zeile hart löschen) ist eine eigene Aktion, siehe unten. */
export async function anonymiseMeeple(meepleId: string) {
  await requireActionPermission("members:manage");

  const stufe1 = await anonymiseMeepleStufe1(meepleId);
  if ("error" in stufe1) return stufe1;

  const stufe2 = await anonymiseMeepleStufe2(meepleId);
  if ("error" in stufe2) return stufe2;

  revalidatePath("/admin/mitglieder");
  revalidatePath("/markt");
  return { success: true as const };
}

/** Löscht die Vereinsmitglied-Zeile endgültig (Stufe 3, #331) — frühestens
 * 12 Monate nach Austritt, ohne offene Ausleihen. */
export async function deleteMemberPermanently(memberId: string) {
  await requireActionPermission("members:manage");

  const result = await anonymiseMemberStufe3(memberId);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function setMemberNumber(meepleId: string, newNumber: number) {
  await requireActionPermission("members:manage");

  const result = await setMemberNumberRecord(meepleId, newNumber);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function renameMeeple(meepleId: string, displayName: string) {
  await requireActionPermission("members:manage");

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

/** Setzt/entfernt die "System-Konto"-Markierung (#297) — schließt das
 * Meeple aus Mitgliederzählungen aus (`buildVereinsmitgliedRows`), unabhängig
 * davon, ob ein `Member` verknüpft ist. Ergänzt `createSystemkonto()` (Login
 * ohne `Member`), ersetzt es nicht. */
export async function setMeepleSystemAccount(
  meepleId: string,
  isSystemAccount: boolean,
) {
  await requireActionPermission("members:manage-system-accounts");

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { isSystemAccount },
  });

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/**
 * A Meeple can hold several roles at once (#335) — this adds one rather than
 * replacing the set. A `window` (explicit startsAt/endsAt, a term of office
 * per #264) requires admin:access; a plain assignment (starts now, never
 * ends) only requires members:manage, same as the old single-role setter.
 * A **Systemrolle** (#353, e.g. "Ausgetreten"/"sysadmin") always requires
 * admin:access, window or not — `members:manage` alone may never assign one.
 */
export async function assignMeepleRole(
  meepleId: string,
  roleId: string,
  window?: { startsAt: Date; endsAt: Date | null },
) {
  // Base gate first, before the DB read decides whether to escalate — a
  // caller without any role-management permission at all must never reach
  // the escalation check (and its own DB read) in the first place.
  await requireActionPermission("members:manage");

  const role = await prisma.role.findUniqueOrThrow({
    where: { id: roleId },
    select: { isSystemRole: true },
  });
  if (window || role.isSystemRole) {
    await requireActionPermission("admin:access");
  }

  const result = await assignMeepleRoleRecord(meepleId, roleId, window);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/** Beendet eine Rollenzuweisung ab jetzt (Historie bleibt erhalten, siehe #264).
 * Systemrollen (#353) erfordern admin:access statt nur members:manage. */
export async function removeMeepleRole(userRoleId: string) {
  const { user: actor } = await requireActionPermission("members:manage");

  const assignment = await prisma.userRole.findUniqueOrThrow({
    where: { id: userRoleId },
    select: { role: { select: { isSystemRole: true } } },
  });
  if (assignment.role.isSystemRole) {
    await requireActionPermission("admin:access");
  }

  const result = await removeMeepleRoleRecord(userRoleId, actor.id);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/** Für die Audit-/Historien-Ansicht (#264) — auch abgelaufene Zuweisungen. */
export async function getMeepleRoleAssignments(neonAuthUserId: string) {
  await requireActionPermission("members:manage");

  return listMeepleRoleAssignments(neonAuthUserId);
}

export async function createRole(name: string, description: string | null) {
  await requireActionPermission("roles:manage");

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
  await requireActionPermission("roles:manage");

  const result = await updateRoleRecord(roleId, name, description);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function deleteRole(roleId: string) {
  await requireActionPermission("roles:manage");

  const result = await deleteRoleRecord(roleId);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
) {
  await requireActionPermission("roles:manage");

  const result = await setRolePermissionsRecord(roleId, permissionIds);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function reorderRoles(roleIds: string[]) {
  await requireActionPermission("roles:manage");

  const result = await reorderRolesRecord(roleIds);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
