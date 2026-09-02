"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
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
import {
  requireBankReader,
  revealMeepleIban,
} from "@/lib/members/bank-access-log";

async function requireMembersManage() {
  return requirePermission("members:manage");
}

/** #264: eine Rollenzuweisung mit explizitem Zeitfenster (Amtszeit) erfordert
 * admin:access, keine eigene feingranulare Permission. */
async function requireAdminAccess() {
  return requirePermission("admin:access");
}

/** #365: Rollen-CRUD/-Rechte-Bearbeitung erfordert die eigene `roles:manage`,
 * nicht `members:manage` — nicht jeder Mitglieder-Admin darf sonst auch die
 * Rollenverwaltung selbst ändern. */
async function requireRolesManage() {
  return requirePermission("roles:manage");
}

/** #297: eigene Permission statt `members:manage`, damit nicht jeder
 * Mitglieder-Admin auch Mitgliederzählungen manipulieren kann — analog
 * `roles:manage`. */
async function requireManageSystemAccounts() {
  return requirePermission("members:manage-system-accounts");
}

/** How many games and units currently sit with this Meeple, for the confirmation dialog. */
export async function getOpenHoldingsSummary(meepleId: string) {
  await requireMembersManage();

  return countOpenHoldings(meepleId);
}

/** `meepleId` weiterhin, weil die Admin-UI Meeples auflistet — die Kündigung
 * selbst wird seit #328 auf der verknüpften `Member`-Zeile vermerkt. */
export async function recordResignation(meepleId: string, endsAt: Date) {
  await requireMembersManage();

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
  await requireMembersManage();

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
  await requireMembersManage();

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
  await requireMembersManage();

  const result = await anonymiseMemberStufe3(memberId);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
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

/** Setzt/entfernt die "System-Konto"-Markierung (#297) — schließt das
 * Meeple aus Mitgliederzählungen aus (`buildVereinsmitgliedRows`), unabhängig
 * davon, ob ein `Member` verknüpft ist. Ergänzt `createSystemkonto()` (Login
 * ohne `Member`), ersetzt es nicht. */
export async function setMeepleSystemAccount(
  meepleId: string,
  isSystemAccount: boolean,
) {
  await requireManageSystemAccounts();

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { isSystemAccount },
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
  await requireMembersManage();

  const role = await prisma.role.findUniqueOrThrow({
    where: { id: roleId },
    select: { isSystemRole: true },
  });
  if (window || role.isSystemRole) {
    await requireAdminAccess();
  }

  const result = await assignMeepleRoleRecord(meepleId, roleId, window);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/** Beendet eine Rollenzuweisung ab jetzt (Historie bleibt erhalten, siehe #264).
 * Systemrollen (#353) erfordern admin:access statt nur members:manage. */
export async function removeMeepleRole(userRoleId: string) {
  const actor = await requireMembersManage();

  const assignment = await prisma.userRole.findUniqueOrThrow({
    where: { id: userRoleId },
    select: { role: { select: { isSystemRole: true } } },
  });
  if (assignment.role.isSystemRole) {
    await requireAdminAccess();
  }

  const result = await removeMeepleRoleRecord(userRoleId, actor.id);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/** Für die Audit-/Historien-Ansicht (#264) — auch abgelaufene Zuweisungen. */
export async function getMeepleRoleAssignments(neonAuthUserId: string) {
  await requireMembersManage();

  return listMeepleRoleAssignments(neonAuthUserId);
}

export async function createRole(name: string, description: string | null) {
  await requireRolesManage();

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
  await requireRolesManage();

  const result = await updateRoleRecord(roleId, name, description);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function deleteRole(roleId: string) {
  await requireRolesManage();

  const result = await deleteRoleRecord(roleId);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
) {
  await requireRolesManage();

  const result = await setRolePermissionsRecord(roleId, permissionIds);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function reorderRoles(roleIds: string[]) {
  await requireRolesManage();

  const result = await reorderRolesRecord(roleIds);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
